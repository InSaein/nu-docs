import Link from "next/link";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { TreasuryBreadcrumb, TreasuryPortalShell } from "@/components/treasury-portal-shell";
import { formatTreasuryCurrency } from "@/lib/treasury-format";
import { defaultDateRange, resolveDateRange } from "@/lib/treasury-report-utils";
import { getPaymentMethodLabel } from "@/lib/payment-options";
import { getTreasuryCollectionReport } from "@/lib/server/treasury-reports";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const found = params[key];
  return typeof found === "string" ? found : "";
}

export default async function TreasuryReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const from = value(params, "from") || defaults.from;
  const to = value(params, "to") || defaults.to;
  const report = await getTreasuryCollectionReport(from, to);
  const resolved = resolveDateRange(from, to);
  const exportQuery = new URLSearchParams({ from, to }).toString();
  const hasRecords = report.confirmedPayments > 0 || report.pendingPayments > 0 || report.rejectedPayments > 0;

  return (
    <TreasuryPortalShell>
      <TreasuryBreadcrumb currentPage="Collection reports" />
      <PageHeader eyebrow="Treasury Portal / Reports" title="Collection Reports" description="Current confirmed collections and payment activity for a selected date range." />
      <form className="history-toolbar surface treasury-report-filters" method="get">
        <label className="treasury-date-filter">From <input type="date" name="from" defaultValue={from} /></label>
        <label className="treasury-date-filter">To <input type="date" name="to" defaultValue={to} /></label>
        <button className="btn btn-primary" type="submit">Run report</button>
        {!report.error && <Link className="btn btn-quiet" href={`/treasury/reports/export?${exportQuery}`}>Export collections CSV</Link>}
      </form>
      <p className="muted treasury-report-note">
        {resolved.range
          ? `Selected range: ${resolved.range.from} through ${resolved.range.to} (UTC). Confirmed collections use the Treasury confirmation timestamp (paidAt); pending and rejected counts use payment submission date (createdAt). Maximum range: 366 days.`
          : "Select a valid date range of 366 days or fewer."}
      </p>
      {report.error && <p className="notice notice-blue" role="alert">{report.error}</p>}
      {!report.error && !hasRecords && <p className="surface pad empty-state">No payment records match this date range.</p>}
      {!report.error && hasRecords && <>
        <div className="grid-3 registrar-stats treasury-stats">
          <div className="surface stat"><span className="muted">Confirmed collections</span><strong className="stat-number treasury-total-collected">{formatTreasuryCurrency(report.totalCollected)}</strong><span className="muted stat-note">Current PAID records in range</span></div>
          <div className="surface stat"><span className="muted">Confirmed payments</span><strong className="stat-number">{report.confirmedPayments}</strong><span className="muted stat-note">By recorded confirmation date</span></div>
          <div className="surface stat"><span className="muted">Pending payments</span><strong className="stat-number">{report.pendingPayments}</strong><span className="muted stat-note">By payment submission date</span></div>
          <div className="surface stat"><span className="muted">Rejected payments</span><strong className="stat-number">{report.rejectedPayments}</strong><span className="muted stat-note">By payment submission date</span></div>
        </div>
        <section className="surface pad treasury-report-section">
          <h2>Confirmed collections by payment method</h2>
          {report.byMethod.length ? <div className="table-wrap"><table className="data-table registrar-table treasury-table">
            <thead><tr><th>Payment method</th><th>Confirmed payments</th><th>Collections</th></tr></thead>
            <tbody>{report.byMethod.map((row) => <tr key={row.method ?? "unknown"}>
              <td>{getPaymentMethodLabel(row.method) ?? "Not recorded"}</td><td>{row.count}</td><td>{formatTreasuryCurrency(row.total)}</td>
            </tr>)}</tbody>
          </table></div> : <p className="empty-state">No confirmed collections match this date range.</p>}
        </section>
        <section className="surface pad treasury-report-section">
          <h2>Confirmed collections by day</h2>
          {report.byDay.length ? <div className="table-wrap"><table className="data-table registrar-table treasury-table">
            <thead><tr><th>Date (UTC)</th><th>Confirmed payments</th><th>Collections</th></tr></thead>
            <tbody>{report.byDay.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.count}</td><td>{formatTreasuryCurrency(row.total)}</td></tr>)}</tbody>
          </table></div> : <p className="empty-state">No confirmed collections match this date range.</p>}
        </section>
        <p className="muted treasury-report-note">Audit entries are not summed. Collection totals are aggregated directly from payment records currently marked PAID, without joining request items or audit history. CSV exports are capped at 10,000 rows.</p>
        {report.confirmedPayments > 10_000 && <p className="notice notice-blue treasury-report-note">This report matches more than 10,000 confirmed payments. The CSV includes the earliest 10,000 by confirmation time.</p>}
      </>}
      <div className="treasury-report-links"><Link className="link" href="/treasury/audit">Review payment audit history →</Link><StatusPill tone="pending">Reports reflect current payment status</StatusPill></div>
    </TreasuryPortalShell>
  );
}
