import assert from "node:assert/strict";
import fs from "node:fs";
import { Module } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadTypeScript(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loadedModule = new Module(filePath);
  loadedModule.filename = filePath;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filePath));
  loadedModule._compile(outputText, filePath);
  return loadedModule.exports;
}

const { csvCell, csvDocument } = loadTypeScript("src/lib/csv.ts");
const { resolveDateRange } = loadTypeScript("src/lib/treasury-report-utils.ts");
const { isPortalRole, portalHomePath } = loadTypeScript("src/lib/roles.ts");
const { isPreferencePalette, isThemeMode } = loadTypeScript("src/lib/user-preferences.ts");
const {
  formatManilaDateTime,
  getManilaDate,
  getPickupSlotsForDate,
  hasPickupCapacity,
  isPickupChangeTooLate,
  isPickupRequestEligible,
  manilaDateTimeToUtc,
  validatePickupSchedule,
} = loadTypeScript("src/lib/pickup-scheduling.ts");

test("CSV cells quote delimiters, quotes, and line breaks", () => {
  assert.equal(csvCell('request,"one"\nnext'), '"request,""one""\nnext"');
  assert.equal(
    csvDocument(["Request"], [[csvCell('request,"one"')]]),
    '\uFEFF"Request"\r\n"request,""one"""\r\n',
  );
});

test("CSV cells neutralize formula prefixes after leading whitespace", () => {
  for (const prefix of ["=", "+", "-", "@"]) {
    assert.equal(csvCell(` \t${prefix}SUM(1)`, true), `"' \t${prefix}SUM(1)"`);
  }
  assert.equal(csvCell("normal text", true), '"normal text"');
});

test("report date ranges validate dates, ordering, UTC bounds, and inclusive maximum", () => {
  const valid = resolveDateRange("2026-02-01", "2026-03-02");
  assert.equal(valid.error, null);
  assert.equal(valid.range.start.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(valid.range.endExclusive.toISOString(), "2026-03-03T00:00:00.000Z");
  assert.equal(resolveDateRange("2026-02-30", "2026-03-02").range, null);
  assert.match(resolveDateRange("2026-03-02", "2026-03-01").error, /on or before/);
  assert.equal(resolveDateRange("2025-01-01", "2026-01-01").error, null);
  assert.match(resolveDateRange("2025-01-01", "2026-01-02").error, /366 days/);
});

test("only the three current portal roles are accepted", () => {
  assert.equal(isPortalRole("STUDENT"), true);
  assert.equal(isPortalRole("REGISTRAR"), true);
  assert.equal(isPortalRole("TREASURY"), true);
  for (const value of ["ADMIN", "SUPERUSER", "", null, undefined]) {
    assert.equal(isPortalRole(value), false);
  }
  assert.equal(portalHomePath("TREASURY"), "/treasury/dashboard");
});

test("settings accepts only the supported palette and theme values", () => {
  for (const palette of ["NU_BLUE", "EMERALD", "VIOLET", "AMBER"]) {
    assert.equal(isPreferencePalette(palette), true);
  }
  for (const value of ["BLUE", "RED", "", null, undefined]) {
    assert.equal(isPreferencePalette(value), false);
  }
  for (const mode of ["LIGHT", "DARK", "SYSTEM"]) {
    assert.equal(isThemeMode(mode), true);
  }
  for (const value of ["AUTO", "dark", "", null, undefined]) {
    assert.equal(isThemeMode(value), false);
  }
});

test("audit migration backfills only decisions with recorded reviewer and time", () => {
  const migration = fs.readFileSync(
    path.join(root, "prisma/migrations/20261013210000_add_payment_audit_history/migration.sql"),
    "utf8",
  );
  assert.match(migration, /payment\."rejectionReason",\s*TRUE,/i);
  assert.match(migration, /payment\."reviewedAt"\s+IS NOT NULL/i);
  assert.match(migration, /payment\."reviewedById"\s+IS NOT NULL/i);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/i);
});

test("pickup date and time helpers consistently use Asia/Manila", () => {
  assert.equal(manilaDateTimeToUtc("2026-10-19", "09:00").toISOString(), "2026-10-19T01:00:00.000Z");
  assert.equal(getManilaDate(new Date("2026-10-18T16:00:00.000Z")), "2026-10-19");
  assert.match(formatManilaDateTime(new Date("2026-10-19T01:00:00.000Z")), /Oct 19, 2026/);
  assert.equal(manilaDateTimeToUtc("2026-02-30", "09:00"), null);
  assert.equal(manilaDateTimeToUtc("2026-10-19", "24:00"), null);
});

test("only the authenticated owner can book a request that is ready for release", () => {
  assert.equal(isPickupRequestEligible("student-1", "student-1", "READY_FOR_RELEASE"), true);
  assert.equal(isPickupRequestEligible("student-1", "student-2", "READY_FOR_RELEASE"), false);
  assert.equal(isPickupRequestEligible("student-1", "student-1", "PROCESSING"), false);
  assert.equal(isPickupRequestEligible("student-1", "student-1", "COMPLETED"), false);
});

test("pickup availability applies recurring hours, effective dates, exceptions, and blocks", () => {
  const schedule = {
    enabled: true,
    effectiveFrom: "2026-10-19",
    effectiveUntil: "2026-10-30",
    rules: [{ weekday: 1, opensAt: "09:00", closesAt: "12:00", slotDurationMinutes: 30, capacity: 2 }],
    overrides: [{
      date: "2026-10-26",
      isClosed: true,
      opensAt: null,
      closesAt: null,
      slotDurationMinutes: null,
      capacity: null,
      reason: "Holiday",
    }],
    blockedSlots: [{
      startsAt: new Date("2026-10-19T02:00:00.000Z"),
      endsAt: new Date("2026-10-19T03:00:00.000Z"),
    }],
  };
  const slots = getPickupSlotsForDate(schedule, "2026-10-19", new Date("2026-10-18T00:00:00.000Z"));
  assert.deepEqual(slots.map((slot) => slot.startsAt), [
    "2026-10-19T01:00:00.000Z",
    "2026-10-19T01:30:00.000Z",
    "2026-10-19T03:00:00.000Z",
    "2026-10-19T03:30:00.000Z",
  ]);
  assert.equal(getPickupSlotsForDate(schedule, "2026-10-26", new Date("2026-10-18T00:00:00.000Z")).length, 0);
  assert.equal(getPickupSlotsForDate(schedule, "2026-11-02", new Date("2026-10-18T00:00:00.000Z")).length, 0);
  assert.equal(getPickupSlotsForDate({ ...schedule, enabled: false }, "2026-10-19", new Date("2026-10-18T00:00:00.000Z")).length, 0);
});

test("pickup configuration rejects invalid hours, duplicate weekdays, and overlapping blocks", () => {
  const valid = {
    enabled: true,
    effectiveFrom: "2026-10-19",
    effectiveUntil: null,
    rules: [{ weekday: 1, opensAt: "09:00", closesAt: "17:00", slotDurationMinutes: 30, capacity: 2 }],
    overrides: [],
    blockedSlots: [],
  };
  assert.equal(validatePickupSchedule(valid), null);
  assert.match(validatePickupSchedule({
    ...valid,
    rules: [{ ...valid.rules[0], closesAt: "08:00" }],
  }), /opening and closing times/);
  assert.match(validatePickupSchedule({
    ...valid,
    rules: [valid.rules[0], valid.rules[0]],
  }), /only one recurring rule/);
  assert.match(validatePickupSchedule({
    ...valid,
    blockedSlots: [
      { startsAt: new Date("2026-10-19T01:00:00Z"), endsAt: new Date("2026-10-19T02:00:00Z") },
      { startsAt: new Date("2026-10-19T01:30:00Z"), endsAt: new Date("2026-10-19T02:30:00Z") },
    ],
  }), /cannot overlap/);
});

test("capacity checks reject full slots and the student change cutoff is enforced", () => {
  assert.equal(hasPickupCapacity(3, 2), true);
  assert.equal(hasPickupCapacity(3, 3), false);
  assert.equal(hasPickupCapacity(0, 0), false);
  const now = new Date("2026-10-14T00:00:00.000Z");
  assert.equal(isPickupChangeTooLate(new Date("2026-10-14T23:59:59.999Z"), now), true);
  assert.equal(isPickupChangeTooLate(new Date("2026-10-15T00:00:00.000Z"), now), false);
});

test("pickup migration enforces one scheduled appointment per request and preserves history", () => {
  const migration = fs.readFileSync(
    path.join(root, "prisma/migrations/20261014180000_add_pickup_scheduling/migration.sql"),
    "utf8",
  );
  assert.match(migration, /PickupAppointment_one_scheduled_per_request_key[\s\S]*WHERE "status" = 'SCHEDULED'/);
  assert.match(migration, /PickupAppointment_requestId_fkey[\s\S]*ON DELETE RESTRICT/);
  assert.match(migration, /PickupAppointmentHistory/);
  assert.match(migration, /PickupBlockedSlot_time_range_check/);
});

test("pickup advisory locks return a Prisma-supported value", () => {
  const pickupActions = fs.readFileSync(
    path.join(root, "src/lib/server/pickup-scheduling.ts"),
    "utf8",
  );
  const requestActions = fs.readFileSync(
    path.join(root, "src/lib/server/requests.ts"),
    "utf8",
  );
  assert.match(pickupActions, /SELECT pg_advisory_xact_lock\(\$\{PICKUP_LOCK_KEY\}\) IS NULL AS "locked"/);
  assert.match(requestActions, /SELECT pg_advisory_xact_lock\(741023\) IS NULL AS "locked"/);
  assert.doesNotMatch(pickupActions, /SELECT pg_advisory_xact_lock\(\$\{PICKUP_LOCK_KEY\}\)`/);
});
