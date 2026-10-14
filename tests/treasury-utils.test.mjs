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
