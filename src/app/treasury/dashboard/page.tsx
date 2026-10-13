import Link from "next/link";
import { PageHeader, SectionHeading, StatusPill } from "@/components/app-shell";
import { TreasuryBreadcrumb, TreasuryPortalShell } from "@/components/treasury-portal-shell";
import { getTreasuryDashboardData } from "@/lib/server/treasury-payments";
import { formatTreasuryCurrency, formatTreasuryDate } from "@/lib/treasury-format";

export default async function TreasuryDashboardPage() {
  const dashboard = await getTreasuryDashboardData();

  return (
    <TreasuryPortalShell>
      <TreasuryBreadcrumb currentPage="Dashboard" />
      <PageHeader eyebrow="Treasury Portal / Overview" title="Treasury Dashboard" description="Review recorded payment activity and collections." />
      <div className="grid-3 registrar-stats treasury-stats">
        <div className="surface stat"><span className="muted">Pending payments</span><strong className="stat-number">{dashboard.pendingPayments}</strong><span className="muted stat-note">Awaiting Treasury review</span></div>
        <div className="surface stat"><span className="muted">Confirmed payments</span><strong className="stat-number">{dashboard.paidPayments}</strong><span className="muted stat-note">Recorded as paid</span></div>
        <div className="surface stat"><span className="muted">Rejected payments</span><strong className="stat-number">{dashboard.rejectedPayments}</strong><span className="muted stat-note">Rejected by Treasury</span></div>
        <div className="surface stat"><span className="muted">Total collected</span><strong className="stat-number treasury-total-collected">{formatTreasuryCurrency(dashboard.totalCollected)}</strong><span className="muted stat-note">Recorded amounts on paid records</span></div>
      </div>
      <SectionHeading title="Recent payment activity" link="View all payments" href="/treasury/payments" />
      <div className="surface table-wrap">
        {dashboard.recentPayments.length ? (
          <table className="data-table registrar-table treasury-table">
            <thead><tr><th>Request number</th><th>Student</th><th>Record created</th><th>Amount recorded</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {dashboard.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.requestNumber}</strong></td>
                  <td>{payment.studentName}</td>
                  <td>{formatTreasuryDate(payment.createdAt)}</td>
                  <td>{formatTreasuryCurrency(payment.amount)}</td>
                  <td><StatusPill tone={payment.status === "PAID" ? "approved" : payment.status === "REJECTED" ? "rejected" : "pending"}>{payment.status}</StatusPill></td>
                  <td><Link className="link" href={`/treasury/payments/${encodeURIComponent(payment.id)}`}>View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty-state">No payment records are available yet.</p>}
      </div>
      <div className="treasury-report-links">
        <Link className="btn btn-secondary" href="/treasury/reports">View collection reports</Link>
        <Link className="btn btn-quiet" href="/treasury/audit">View payment audit history</Link>
      </div>
    </TreasuryPortalShell>
  );
}
