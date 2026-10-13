import Link from "next/link";
import { PaymentAuditAction, PaymentStatus } from "@prisma/client";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { TreasuryBreadcrumb, TreasuryPortalShell } from "@/components/treasury-portal-shell";
import { formatTreasuryUtcDate } from "@/lib/treasury-format";
import { defaultDateRange } from "@/lib/treasury-report-utils";
import { getTreasuryAuditHistory, type AuditFilters } from "@/lib/server/treasury-reports";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const found = params[key];
  return typeof found === "string" ? found : "";
}

function auditHref(filters: AuditFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.action) params.set("action", filters.action);
  if (filters.status) params.set("status", filters.status);
  if (filters.query) params.set("q", filters.query);
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize ?? 10));
  return `/treasury/audit?${params.toString()}`;
}

export default async function TreasuryAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const filters: AuditFilters = {
    from: value(params, "from") || defaults.from,
    to: value(params, "to") || defaults.to,
    action: value(params, "action"),
    status: value(params, "status"),
    query: value(params, "q").trim().slice(0, 100),
    page: Number(value(params, "page")) || 1,
    pageSize: [25, 50].includes(Number(value(params, "pageSize"))) ? Number(value(params, "pageSize")) : 10,
  };
  const result = await getTreasuryAuditHistory(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const page = Math.min(result.page, totalPages);
  const exportParams = new URLSearchParams();
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  if (filters.action) exportParams.set("action", filters.action);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.query) exportParams.set("q", filters.query);

  return (
    <TreasuryPortalShell>
      <TreasuryBreadcrumb currentPage="Payment audit" />
      <PageHeader eyebrow="Treasury Portal / Audit" title="Payment Audit History" description="Append-only application history of Treasury payment decisions." />
      <form className="history-toolbar surface treasury-report-filters" method="get">
        <label className="treasury-date-filter">From <input type="date" name="from" defaultValue={filters.from} /></label>
        <label className="treasury-date-filter">To <input type="date" name="to" defaultValue={filters.to} /></label>
        <select name="action" defaultValue={filters.action} aria-label="Filter by action">
          <option value="">All actions</option>
          {Object.values(PaymentAuditAction).map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} aria-label="Filter by resulting status">
          <option value="">All resulting statuses</option>
          {Object.values(PaymentStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <input name="q" defaultValue={filters.query} maxLength={100} placeholder="Request number or payment ID" aria-label="Search request or payment" />
        <input type="hidden" name="page" value="1" />
        <button className="btn btn-primary" type="submit">Apply filters</button>
        <Link className="btn btn-quiet" href={`/treasury/audit/export?${exportParams}`}>Export CSV</Link>
      </form>
      <p className="muted treasury-report-note">
        Showing audit events from {filters.from} through {filters.to} (UTC). Export is capped at 10,000 rows.
        {result.total > 10_000 && " Current filters match more entries; CSV includes the newest 10,000."}
      </p>
      {result.error && <p className="notice notice-blue" role="alert">{result.error}</p>}
      <div className="surface table-wrap">
        {result.error ? null : result.entries.length === 0 ? (
          <p className="empty-state">No payment audit entries match these filters.</p>
        ) : (
          <table className="data-table registrar-table treasury-table">
            <thead><tr><th>Date / time (UTC)</th><th>Request</th><th>Student number</th><th>Action</th><th>Previous status</th><th>Resulting status</th><th>Treasury user</th><th>Rejection reason</th></tr></thead>
            <tbody>{result.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatTreasuryUtcDate(entry.createdAt)}</td>
                <td><strong>{entry.requestNumber}</strong><small className="treasury-audit-id">Payment {entry.paymentId}</small></td>
                <td>{entry.studentNumber ?? "Not available"}</td>
                <td>{entry.action}{entry.isBackfilled && <small className="treasury-audit-id">Backfilled from Part 3 review fields</small>}</td>
                <td>{entry.previousStatus}</td>
                <td><StatusPill tone={entry.newStatus === "PAID" ? "approved" : "rejected"}>{entry.newStatus}</StatusPill></td>
                <td>{entry.actorName}</td>
                <td>{entry.rejectionReason ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {!result.error && result.total > 0 && <div className="registrar-pagination">
        <p className="registrar-pagination-summary" role="status">Page {page} of {totalPages} · {result.total} audit entries</p>
        <div className="registrar-pagination-controls">
          {page > 1 ? <Link className="btn btn-quiet" href={auditHref(filters, page - 1)}>Previous</Link> : <button className="btn btn-quiet" disabled>Previous</button>}
          {page < totalPages ? <Link className="btn btn-quiet" href={auditHref(filters, page + 1)}>Next</Link> : <button className="btn btn-quiet" disabled>Next</button>}
        </div>
      </div>}
    </TreasuryPortalShell>
  );
}
