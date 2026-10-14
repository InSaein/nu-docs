"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PickupActionDialog } from "@/components/pickup-action-dialog";
import { RegistrarBreadcrumb, RegistrarPortalShell } from "@/components/registrar-portal-shell";
import { formatManilaDateTime } from "@/lib/pickup-scheduling";
import {
  cancelPickupAppointmentAsRegistrar,
  confirmPickupHandover,
  getRegistrarPickupSchedule,
} from "@/lib/server/pickup-scheduling";

type PickupData = Awaited<ReturnType<typeof getRegistrarPickupSchedule>>;
type PickupAppointment = PickupData["appointments"][number];
type PendingAction = { appointment: PickupAppointment; action: "complete" | "cancel" } | null;

function statusLabel(status: string) {
  return status === "SCHEDULED" ? "Scheduled" : status === "CANCELLED" ? "Cancelled" : "Completed";
}

function statusClass(status: string) {
  return status === "COMPLETED"
    ? "status-ready-for-release"
    : status === "CANCELLED" ? "status-cancelled" : "status-pending";
}

export function RegistrarUpcomingPickupsPage({ initialData }: { initialData: PickupData }) {
  const [data, setData] = useState(initialData);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("SCHEDULED");
  const [filterSearch, setFilterSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const requestActionConfirmation = (appointment: PickupAppointment, action: "complete" | "cancel") => {
    setError("");
    setMessage("");
    setPendingAction({ appointment, action });
  };

  const refresh = async (filters = { date: filterDate, status: filterStatus, search: filterSearch }) => {
    setData(await getRegistrarPickupSchedule(filters));
  };

  const loadFilteredAppointments = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    void refresh()
      .catch(() => setError("Unable to load pickup appointments. Please try again."))
      .finally(() => setBusy(false));
  };

  const runPendingAction = async () => {
    if (!pendingAction || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = pendingAction.action === "complete"
        ? await confirmPickupHandover(pendingAction.appointment.id)
        : await cancelPickupAppointmentAsRegistrar(pendingAction.appointment.id);
      if (!result.success) {
        setError(result.error ?? "Unable to update this pickup appointment.");
        return;
      }
      const successMessage = pendingAction.action === "complete"
        ? "Pickup confirmed as completed."
        : "Pickup appointment cancelled.";
      setPendingAction(null);
      setMessage(successMessage);
      try {
        await refresh();
      } catch {
        setError("The action succeeded, but the appointment list could not refresh. Reload the page to see the latest status.");
      }
    } catch {
      setError("Unable to update this pickup appointment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RegistrarPortalShell>
      <RegistrarBreadcrumb currentPage="Upcoming Pickups" />
      <PageHeader
        eyebrow="Registrar Portal / Pickup management"
        title="Upcoming Pickups"
        description="Review scheduled document pickups and record handover or cancellation."
      />
      {message && <p className="inline-success pickup-feedback" role="status">{message}</p>}
      {error && <p className="notice notice-blue pickup-feedback" role="alert">{error}</p>}

      <section className="surface pad pickup-panel" aria-labelledby="upcoming-pickups-title">
        <div className="pickup-panel-heading">
          <div>
            <h2 id="upcoming-pickups-title">Pickup appointments</h2>
            <p className="muted">Times are shown in Asia/Manila. The list covers the next 90 days unless a date is selected.</p>
          </div>
        </div>
        <form className="pickup-appointment-filters" onSubmit={loadFilteredAppointments}>
          <label className="field">
            <span>Filter by date</span>
            <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Appointment status</span>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="field">
            <span>Student or request</span>
            <input value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} placeholder="Search name, student ID, request" />
          </label>
          <button className="btn btn-secondary" type="submit" disabled={busy}>{busy ? "Loading…" : "Apply filters"}</button>
        </form>

        {data.appointments.length ? (
          <div className="pickup-appointment-list" aria-busy={busy}>
            {data.appointments.map((appointment) => (
              <article className="pickup-appointment-card" key={appointment.id}>
                <div className="pickup-appointment-card-heading">
                  <div>
                    <strong>{formatManilaDateTime(new Date(appointment.startsAt))}</strong>
                    <span>{appointment.studentName} · {appointment.studentNumber ?? "Student ID unavailable"}</span>
                  </div>
                  <span className={`status ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                </div>
                <dl className="pickup-appointment-details">
                  <div>
                    <dt>Request</dt>
                    <dd><Link className="link" href={`/registrar/requests/${encodeURIComponent(appointment.requestNumber)}`}>{appointment.requestNumber}</Link></dd>
                  </div>
                  <div><dt>Document</dt><dd>{appointment.documentType.replaceAll("_", " ")}</dd></div>
                  <div><dt>Request status</dt><dd>{appointment.requestStatus.replaceAll("_", " ")}</dd></div>
                </dl>
                {appointment.status === "SCHEDULED" && (
                  <div className="pickup-actions">
                    {appointment.requestStatus === "READY_FOR_RELEASE" && (
                      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => requestActionConfirmation(appointment, "complete")}>
                        Confirm handover
                      </button>
                    )}
                    <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => requestActionConfirmation(appointment, "cancel")}>
                      Cancel pickup
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="pickup-empty-state" role="status">
            <strong>No pickup appointments found</strong>
            <p className="muted">There are no appointments matching these filters. Try another date or status, or check the Pickup Schedule configuration.</p>
          </div>
        )}
      </section>

      <PickupActionDialog
        open={pendingAction !== null}
        title={pendingAction?.action === "complete" ? "Confirm document handover?" : "Cancel pickup appointment?"}
        description={pendingAction?.action === "complete"
          ? `Confirm that the document for request ${pendingAction.appointment.requestNumber} has been handed to the student. This will complete the request.`
          : `Cancel the scheduled pickup for request ${pendingAction?.appointment.requestNumber ?? ""}? The student will be notified.`}
        confirmLabel={pendingAction?.action === "complete" ? "Confirm handover" : "Cancel pickup"}
        cancelLabel={pendingAction?.action === "complete" ? "Go back" : "Keep appointment"}
        error={error}
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void runPendingAction()}
      />
    </RegistrarPortalShell>
  );
}
