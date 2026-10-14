"use client";

import { useMemo, useState } from "react";
import { RegistrarBreadcrumb, RegistrarPortalShell } from "@/components/registrar-portal-shell";
import { PageHeader } from "@/components/app-shell";
import { formatManilaDateTime, getManilaDate, type PickupRuleInput } from "@/lib/pickup-scheduling";
import {
  addPickupBlockedSlot,
  getRegistrarPickupConfiguration,
  removePickupBlockedSlot,
  removePickupDateOverride,
  savePickupDateOverride,
  savePickupWeeklySchedule,
} from "@/lib/server/pickup-scheduling";

type ScheduleData = Awaited<ReturnType<typeof getRegistrarPickupConfiguration>>;
type EditableRule = PickupRuleInput & { enabled: boolean };

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function dateInputValue() {
  return getManilaDate(new Date());
}

function initialRules(schedule: ScheduleData["schedule"]): EditableRule[] {
  const configured = new Map(schedule.weeklyRules.map((rule) => [rule.weekday, rule]));
  return weekdays.map(({ value }) => {
    const existing = configured.get(value);
    return {
      weekday: value,
      enabled: Boolean(existing),
      opensAt: existing?.opensAt ?? "09:00",
      closesAt: existing?.closesAt ?? "17:00",
      slotDurationMinutes: existing?.slotDurationMinutes ?? 30,
      capacity: existing?.capacity ?? 4,
    };
  });
}

export function RegistrarPickupSchedulePage({ initialData }: { initialData: ScheduleData }) {
  const [data, setData] = useState(initialData);
  const [rules, setRules] = useState<EditableRule[]>(() => initialRules(initialData.schedule));
  const [enabled, setEnabled] = useState(initialData.schedule.enabled);
  const [effectiveFrom, setEffectiveFrom] = useState(initialData.schedule.effectiveFrom || dateInputValue());
  const [effectiveUntil, setEffectiveUntil] = useState(initialData.schedule.effectiveUntil ?? "");
  const [exceptionDate, setExceptionDate] = useState(dateInputValue());
  const [exceptionClosed, setExceptionClosed] = useState(true);
  const [exceptionOpens, setExceptionOpens] = useState("09:00");
  const [exceptionCloses, setExceptionCloses] = useState("17:00");
  const [exceptionDuration, setExceptionDuration] = useState("30");
  const [exceptionCapacity, setExceptionCapacity] = useState("4");
  const [exceptionReason, setExceptionReason] = useState("");
  const [blockedDate, setBlockedDate] = useState(dateInputValue());
  const [blockedStart, setBlockedStart] = useState("12:00");
  const [blockedEnd, setBlockedEnd] = useState("13:00");
  const [blockedReason, setBlockedReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const ruleCount = useMemo(() => rules.filter((rule) => rule.enabled).length, [rules]);

  const refresh = async () => {
    const nextData = await getRegistrarPickupConfiguration();
    setData(nextData);
  };

  const runAction = async (
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    reload = true,
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "The operation could not be completed.");
        return;
      }
      if (reload) await refresh();
      setSuccess(successMessage);
    } catch {
      setError("The operation could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(
      () => savePickupWeeklySchedule({
        enabled,
        effectiveFrom,
        effectiveUntil: effectiveUntil || null,
        rules: rules.filter((rule) => rule.enabled).map((rule) => ({
          weekday: rule.weekday,
          opensAt: rule.opensAt,
          closesAt: rule.closesAt,
          slotDurationMinutes: rule.slotDurationMinutes,
          capacity: rule.capacity,
        })),
      }),
      "Recurring pickup schedule saved.",
    );
  };

  const saveException = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(
      () => savePickupDateOverride({
        date: exceptionDate,
        isClosed: exceptionClosed,
        opensAt: exceptionClosed ? null : exceptionOpens,
        closesAt: exceptionClosed ? null : exceptionCloses,
        slotDurationMinutes: exceptionClosed ? null : Number(exceptionDuration),
        capacity: exceptionClosed ? null : Number(exceptionCapacity),
        reason: exceptionReason,
      }),
      "Date exception saved.",
    );
  };

  const saveBlockedTime = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(
      () => addPickupBlockedSlot({
        date: blockedDate,
        startsAt: blockedStart,
        endsAt: blockedEnd,
        reason: blockedReason,
      }),
      "Blocked time added.",
    );
  };

  return (
    <RegistrarPortalShell>
      <RegistrarBreadcrumb currentPage="Pickup Schedule" />
      <PageHeader
        eyebrow="Registrar Portal / Pickup configuration"
        title="Pickup Schedule"
        description="Configure recurring pickup availability, date exceptions, and blocked times."
      />

      {error && <p className="notice notice-blue pickup-feedback" role="alert">{error}</p>}
      {success && <p className="inline-success pickup-feedback" role="status">{success}</p>}

      <section className="surface pad pickup-panel" aria-labelledby="weekly-schedule-title">
        <div className="pickup-panel-heading">
          <div>
            <h2 id="weekly-schedule-title">Recurring availability</h2>
            <p className="muted">These weekday hours apply only within the effective date range. All times use Asia/Manila.</p>
          </div>
          <span className={`status ${enabled ? "status-ready-for-release" : "status-cancelled"}`}>{enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <form onSubmit={saveSchedule} aria-busy={busy}>
          <div className="pickup-effective-dates">
            <label className="field">
              <span>Effective from</span>
              <input type="date" required value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
            </label>
            <label className="field">
              <span>Effective until (optional)</span>
              <input type="date" min={effectiveFrom} value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} />
            </label>
            <label className="pickup-enabled-toggle">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              Enable bookings
            </label>
          </div>
          <div className="pickup-weekly-rules">
            {rules.map((rule, index) => (
              <fieldset className="pickup-weekday-rule" key={rule.weekday}>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))}
                    />
                    {weekdays[index].label}
                  </label>
                </legend>
                <label className="field"><span>Opens</span><input type="time" disabled={!rule.enabled} value={rule.opensAt} onChange={(event) => setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, opensAt: event.target.value } : item))} /></label>
                <label className="field"><span>Closes</span><input type="time" disabled={!rule.enabled} value={rule.closesAt} onChange={(event) => setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, closesAt: event.target.value } : item))} /></label>
                <label className="field"><span>Slot (minutes)</span><input type="number" min="5" max="480" step="5" disabled={!rule.enabled} value={rule.slotDurationMinutes} onChange={(event) => setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, slotDurationMinutes: Number(event.target.value) } : item))} /></label>
                <label className="field"><span>Capacity per slot</span><input type="number" min="1" step="1" disabled={!rule.enabled} value={rule.capacity} onChange={(event) => setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, capacity: Number(event.target.value) } : item))} /></label>
              </fieldset>
            ))}
          </div>
          <p className="muted pickup-help">{ruleCount} working day{ruleCount === 1 ? "" : "s"} configured. Changes that would invalidate existing appointments are rejected.</p>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save recurring schedule"}</button>
        </form>
      </section>

      <div className="pickup-config-grid">
        <section className="surface pad pickup-panel" aria-labelledby="date-exceptions-title">
          <h2 id="date-exceptions-title">Date exceptions</h2>
          <p className="muted">Close a specific date or override its hours and capacity.</p>
          <form onSubmit={saveException} aria-busy={busy}>
            <label className="field"><span>Date</span><input type="date" required value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /></label>
            <label className="pickup-enabled-toggle">
              <input type="checkbox" checked={exceptionClosed} onChange={(event) => setExceptionClosed(event.target.checked)} />
              Closed for this date
            </label>
            {!exceptionClosed && (
              <div className="pickup-inline-fields">
                <label className="field"><span>Opens</span><input type="time" required value={exceptionOpens} onChange={(event) => setExceptionOpens(event.target.value)} /></label>
                <label className="field"><span>Closes</span><input type="time" required value={exceptionCloses} onChange={(event) => setExceptionCloses(event.target.value)} /></label>
                <label className="field"><span>Slot (minutes)</span><input type="number" min="5" max="480" step="5" required value={exceptionDuration} onChange={(event) => setExceptionDuration(event.target.value)} /></label>
                <label className="field"><span>Capacity per slot</span><input type="number" min="1" required value={exceptionCapacity} onChange={(event) => setExceptionCapacity(event.target.value)} /></label>
              </div>
            )}
            <label className="field"><span>Reason (optional)</span><input maxLength={240} value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save date exception"}</button>
          </form>
          {data.schedule.dateOverrides.length > 0 && (
            <ul className="pickup-config-list">
              {data.schedule.dateOverrides.map((item) => (
                <li key={item.id}>
                  <span><strong>{item.date}</strong> — {item.isClosed ? "Closed" : `${item.opensAt}–${item.closesAt}; ${item.capacity} per slot`}{item.reason ? ` (${item.reason})` : ""}</span>
                  <button className="link" type="button" disabled={busy} onClick={() => void runAction(() => removePickupDateOverride(item.id), "Date exception removed.")}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface pad pickup-panel" aria-labelledby="blocked-times-title">
          <h2 id="blocked-times-title">Blocked times</h2>
          <p className="muted">Block unexpected unavailable intervals without changing the recurring hours.</p>
          <form onSubmit={saveBlockedTime} aria-busy={busy}>
            <label className="field"><span>Date</span><input type="date" required value={blockedDate} onChange={(event) => setBlockedDate(event.target.value)} /></label>
            <div className="pickup-inline-fields">
              <label className="field"><span>Starts</span><input type="time" required value={blockedStart} onChange={(event) => setBlockedStart(event.target.value)} /></label>
              <label className="field"><span>Ends</span><input type="time" required value={blockedEnd} onChange={(event) => setBlockedEnd(event.target.value)} /></label>
            </div>
            <label className="field"><span>Reason (optional)</span><input maxLength={240} value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Block time"}</button>
          </form>
          {data.schedule.blockedSlots.length > 0 && (
            <ul className="pickup-config-list">
              {data.schedule.blockedSlots.map((item) => (
                <li key={item.id}>
                  <span>{formatManilaDateTime(new Date(item.startsAt))}–{new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(new Date(item.endsAt))}{item.reason ? ` (${item.reason})` : ""}</span>
                  <button className="link" type="button" disabled={busy} onClick={() => void runAction(() => removePickupBlockedSlot(item.id), "Blocked time removed.")}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </RegistrarPortalShell>
  );
}
