"use client";

import { useEffect, useMemo, useState } from "react";
import { formatManilaDateTime, getManilaDate } from "@/lib/pickup-scheduling";
import {
  bookPickupAppointment,
  cancelPickupAppointment,
  getStudentPickupInfo,
  reschedulePickupAppointment,
} from "@/lib/server/pickup-scheduling";

type PickupInfo = NonNullable<Awaited<ReturnType<typeof getStudentPickupInfo>>>;
const DATES_PER_PAGE = 5;

function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...options })
    .format(new Date(`${value}T12:00:00+08:00`));
}

function slotTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function StudentPickupSection({ requestNumber }: { requestNumber: string }) {
  const [info, setInfo] = useState<PickupInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [datePageStart, setDatePageStart] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, PickupInfo["availableSlots"]>();
    for (const slot of info?.availableSlots ?? []) {
      const date = getManilaDate(new Date(slot.startsAt));
      groups.set(date, [...(groups.get(date) ?? []), slot]);
    }
    return groups;
  }, [info]);
  const availabilityDates = info?.availabilityDates ?? [];
  const maxDatePageStart = Math.max(0, Math.ceil(availabilityDates.length / DATES_PER_PAGE) * DATES_PER_PAGE - DATES_PER_PAGE);
  const activeDate = availabilityDates.includes(selectedDate)
    ? selectedDate
    : availabilityDates.find((date) => (slotsByDate.get(date)?.length ?? 0) > 0) ?? availabilityDates[0] ?? "";
  const activeDateIndex = availabilityDates.indexOf(activeDate);
  const visibleDatePageStart = Math.min(
    selectedDate ? datePageStart : Math.floor(Math.max(activeDateIndex, 0) / DATES_PER_PAGE) * DATES_PER_PAGE,
    maxDatePageStart,
  );
  const visibleDates = availabilityDates.slice(visibleDatePageStart, visibleDatePageStart + DATES_PER_PAGE);
  const selectedDateSlots = slotsByDate.get(activeDate) ?? [];

  const selectDatePage = (start: number) => {
    const nextStart = Math.max(0, Math.min(start, maxDatePageStart));
    const pageDates = availabilityDates.slice(nextStart, nextStart + DATES_PER_PAGE);
    setDatePageStart(nextStart);
    setSelectedDate(pageDates.find((date) => (slotsByDate.get(date)?.length ?? 0) > 0) ?? pageDates[0] ?? "");
    setSelectedSlot("");
  };

  const selectDate = (date: string) => {
    const index = availabilityDates.indexOf(date);
    if (index < 0) return;
    setDatePageStart(Math.floor(index / DATES_PER_PAGE) * DATES_PER_PAGE);
    setSelectedDate(date);
    setSelectedSlot("");
  };

  const reload = async () => {
    const next = await getStudentPickupInfo(requestNumber);
    if (next) setInfo(next);
  };

  useEffect(() => {
    let active = true;
    getStudentPickupInfo(requestNumber)
      .then((result) => {
        if (active && result) setInfo(result);
      })
      .catch(() => {
        if (active) setError("Unable to load pickup availability. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [requestNumber]);

  const runBookingAction = async (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Unable to update pickup.");
        return;
      }
      setSelectedSlot("");
      setMessage(successMessage);
      try {
        await reload();
      } catch {
        setError("Saved successfully, but pickup details could not refresh. Reload the page to see the latest appointment.");
      }
    } catch {
      setError("Unable to update pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="track-section pickup-student-section" aria-labelledby="pickup-heading" aria-busy="true">
      <h2 id="pickup-heading">Schedule pickup</h2>
      <p className="muted" role="status">Loading pickup availability…</p>
    </section>;
  }

  if (!info?.eligible) return null;

  const rescheduling = Boolean(info.appointment);
  const handleSlotAction = () => {
    if (!selectedSlot) return;
    if (info.appointment) {
      void runBookingAction(
        () => reschedulePickupAppointment(info.appointment!.id, selectedSlot),
        "Pickup appointment rescheduled.",
      );
    } else {
      void runBookingAction(
        () => bookPickupAppointment(requestNumber, selectedSlot),
        "Pickup appointment confirmed.",
      );
    }
  };

  return (
    <section className="track-section pickup-student-section" aria-labelledby="pickup-heading">
      <h2 id="pickup-heading">Schedule pickup</h2>
      <p className="muted">Choose an available date and time to collect your document from the Registrar&apos;s Office. Times are shown in Asia/Manila.</p>
      {info.appointment ? (
        <div className="pickup-confirmed" aria-label="Confirmed pickup appointment">
          <strong>Pickup scheduled</strong>
          <span>{formatManilaDateTime(new Date(info.appointment.startsAt))}</span>
          <p className="muted">You may change or cancel at least 24 hours before your appointment.</p>
          <div className="pickup-actions">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={submitting}
              onClick={() => void runBookingAction(
                () => cancelPickupAppointment(info.appointment!.id),
                "Pickup appointment cancelled.",
              )}
            >
              Cancel pickup
            </button>
          </div>
        </div>
      ) : null}
      <div
        className="pickup-slot-picker"
        role="group"
        aria-label={rescheduling ? "Choose a new pickup date and time" : "Choose a pickup date and time"}
      >
        <div className="pickup-date-picker-heading">
          <h3>{rescheduling ? "Choose a new date and time" : "Available dates"}</h3>
          <nav className="pickup-date-navigation" aria-label="Browse available dates">
            <button
              className="pickup-date-nav-button"
              type="button"
              aria-label="Show previous dates"
              disabled={visibleDatePageStart === 0}
              onClick={() => selectDatePage(visibleDatePageStart - DATES_PER_PAGE)}
            >
              Previous
            </button>
            <button
              className="pickup-date-nav-button"
              type="button"
              aria-label="Show next dates"
              disabled={visibleDatePageStart >= maxDatePageStart}
              onClick={() => selectDatePage(visibleDatePageStart + DATES_PER_PAGE)}
            >
              Next
            </button>
          </nav>
        </div>
        {visibleDates.length > 0 ? (
          <div className="pickup-date-list" role="group" aria-label="Pickup dates">
            {visibleDates.map((date) => {
              const slots = slotsByDate.get(date) ?? [];
              const selected = date === activeDate;
              return (
                <button
                  className={`pickup-date-button${selected ? " selected" : ""}`}
                  type="button"
                  key={date}
                  aria-pressed={selected}
                  aria-label={`${dateLabel(date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}, ${slots.length} available time${slots.length === 1 ? "" : "s"}`}
                  onClick={() => selectDate(date)}
                >
                  <span>{dateLabel(date, { weekday: "short" })}</span>
                  <strong>{dateLabel(date, { day: "numeric", month: "short" })}</strong>
                  <small>{slots.length ? `${slots.length} time${slots.length === 1 ? "" : "s"}` : "No times"}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted pickup-empty-state">No pickup dates are currently available. Please contact the Registrar&apos;s Office.</p>
        )}
        <div className="pickup-time-picker">
          <h4>{activeDate ? `Pickup times for ${dateLabel(activeDate, { weekday: "long", month: "long", day: "numeric" })}` : "Pickup times"}</h4>
          {selectedDateSlots.length > 0 ? (
            <div className="pickup-time-grid" role="group" aria-label={`Available pickup times for ${activeDate}`}>
              {selectedDateSlots.map((slot) => {
                const selected = slot.startsAt === selectedSlot;
                return (
                  <button
                    className={`pickup-time-button${selected ? " selected" : ""}`}
                    type="button"
                    key={slot.startsAt}
                    aria-pressed={selected}
                    aria-label={`${slotTimeLabel(slot.startsAt)}; ${slot.remaining} ${slot.remaining === 1 ? "space" : "spaces"} available`}
                    disabled={submitting}
                    onClick={() => setSelectedSlot(selected ? "" : slot.startsAt)}
                  >
                    <strong>{slotTimeLabel(slot.startsAt)}</strong>
                    <span>{slot.remaining} {slot.remaining === 1 ? "space" : "spaces"} left</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted pickup-empty-state">
              {activeDate
                ? "No pickup times are available on this date. Choose another date above to see available times."
                : "There are no pickup times available in the current scheduling window. Please contact the Registrar's Office."}
            </p>
          )}
        </div>
        {!rescheduling && (
          <button
            className="btn btn-primary"
            type="button"
            disabled={submitting || !selectedSlot}
            onClick={handleSlotAction}
          >
            {submitting ? "Scheduling…" : "Confirm pickup"}
          </button>
        )}
        {rescheduling && (
          <button
            className="btn btn-primary"
            type="button"
            disabled={submitting || !selectedSlot}
            onClick={handleSlotAction}
          >
            {submitting ? "Updating…" : "Reschedule pickup"}
          </button>
        )}
      </div>
      {message && <p className="inline-success" role="status">{message}</p>}
      {error && <p className="notice notice-blue" role="alert">{error}</p>}
      {info.appointmentHistory.slice(0, 3).map((appointment) => (
        <p className="muted pickup-history-item" key={appointment.id}>
          Previous appointment: {formatManilaDateTime(new Date(appointment.startsAt))} ({appointment.status.toLowerCase()}).
        </p>
      ))}
    </section>
  );
}
