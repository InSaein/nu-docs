import Link from "next/link";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { TreasuryBreadcrumb, TreasuryPortalShell } from "@/components/treasury-portal-shell";
import { documentLabels } from "@/lib/document-pricing";
import { getPaymentMethodLabel } from "@/lib/payment-options";
import { formatTreasuryCurrency, formatTreasuryDate } from "@/lib/treasury-format";
import { getTreasuryPayments } from "@/lib/server/treasury-payments";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function getPositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function paymentsHref(params: { query: string; status: string; method: string; from: string; to: string; pageSize: number }, page: number) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.status) search.set("status", params.status);
  if (params.method) search.set("method", params.method);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  search.set("pageSize", String(params.pageSize));
  search.set("page", String(page));
  return `/treasury/payments?${search.toString()}`;
}

export default async function TreasuryPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams;
  const query = getValue(rawParams, "q").trim().slice(0, 100);
  const requestedStatus = getValue(rawParams, "status");
  const requestedMethod = getValue(rawParams, "method");
  const status = Object.values(PaymentStatus).find((value) => value === requestedStatus) ?? "";
  const method = Object.values(PaymentMethod).find((value) => value === requestedMethod) ?? "";
  const from = getValue(rawParams, "from");
  const to = getValue(rawParams, "to");
  const requestedPageSize = Number(getValue(rawParams, "pageSize"));
  const pageSize = requestedPageSize === 25 || requestedPageSize === 50 ? requestedPageSize : 10;
  const page = getPositiveInteger(getValue(rawParams, "page"));
  const filters = { query, status, method, from, to, page, pageSize };
  const results = await getTreasuryPayments(filters);
  const totalPages = Math.max(1, Math.ceil(results.total / results.pageSize));
  const visiblePage = Math.min(results.page, totalPages);
  const firstIndex = results.total ? (visiblePage - 1) * results.pageSize : 0;
  const lastIndex = Math.min(firstIndex + results.payments.length, results.total);
  const paymentMethods = Object.values(PaymentMethod);
  const hasFilters = Boolean(query || status || method || from || to);

  return (
    <TreasuryPortalShell>
      <TreasuryBreadcrumb currentPage="Payments" />
      <PageHeader eyebrow="Treasury Portal / Payments" title="Payment Records" description="Search and review recorded payments. Payment records are read-only in this portal." />
      <form className="history-toolbar surface treasury-payment-filters" method="get">
        <label className="toolbar-search"><span aria-hidden="true">⌕</span><input name="q" defaultValue={query} maxLength={100} placeholder="Request, student, or transaction reference" aria-label="Search payments" /></label>
        <select name="status" defaultValue={status} aria-label="Filter by payment status">
          <option value="">All payment statuses</option>
          {Object.values(PaymentStatus).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select name="method" defaultValue={method} aria-label="Filter by payment method">
          <option value="">All payment methods</option>
          {paymentMethods.map((value) => <option key={value} value={value}>{getPaymentMethodLabel(value)}</option>)}
        </select>
        <label className="treasury-date-filter">From <input type="date" name="from" defaultValue={from} aria-label="From date" /></label>
        <label className="treasury-date-filter">To <input type="date" name="to" defaultValue={to} aria-label="To date" /></label>
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="pageSize" value={pageSize} />
        <button className="btn btn-primary" type="submit">Apply filters</button>
        {hasFilters && <Link className="treasury-clear-filters" href="/treasury/payments">Clear filters</Link>}
      </form>
      {results.error && <p className="notice notice-blue treasury-validation-error" role="alert">{results.error}</p>}
      <div className="surface table-wrap">
        {results.error ? null : results.totalPayments === 0 ? (
          <p className="empty-state">No payment records are available yet.</p>
        ) : results.total === 0 ? (
          <p className="empty-state">No payments match the current search and filters.</p>
        ) : (
          <table className="data-table registrar-table treasury-table">
            <thead><tr><th>Request number</th><th>Student</th><th>Student number</th><th>Documents</th><th>Amount due</th><th>Payment method</th><th>Simulated application reference</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              {results.payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.requestNumber}</strong></td>
                  <td>{payment.studentName}</td>
                  <td>{payment.studentNumber ?? "Not available"}</td>
                  <td className="treasury-document-cell">{payment.documentItems.length ? payment.documentItems.map((item) => `${documentLabels[item.documentType]} × ${item.quantity}`).join(", ") : "Not available"}</td>
                  <td>{formatTreasuryCurrency(payment.amountDue)}</td>
                  <td>{getPaymentMethodLabel(payment.method) ?? "Not provided"}</td>
                  <td>{payment.transactionReference ?? "Not provided"}</td>
                  <td><StatusPill tone={payment.status === "PAID" ? "approved" : payment.status === "REJECTED" ? "rejected" : "pending"}>{payment.status}</StatusPill></td>
                  <td>{formatTreasuryDate(payment.createdAt)}</td>
                  <td><Link className="link" href={`/treasury/payments/${encodeURIComponent(payment.id)}`}>View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {results.total > 0 && (
        <div className="registrar-pagination">
          <p className="registrar-pagination-summary" role="status" aria-live="polite">Showing {firstIndex + 1}–{lastIndex} of {results.total} payments</p>
          <div className="registrar-pagination-controls">
            <form className="registrar-page-size" method="get">
              <label htmlFor="treasury-page-size">Rows per page</label>
              <select id="treasury-page-size" name="pageSize" defaultValue={pageSize}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <input type="hidden" name="q" value={query} />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="method" value={method} />
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <input type="hidden" name="page" value="1" />
              <button className="btn btn-quiet treasury-apply-page-size" type="submit">Apply</button>
            </form>
            <nav className="registrar-page-navigation" aria-label="Payment list pages">
              {visiblePage > 1
                ? <Link className="btn btn-quiet" href={paymentsHref(filters, visiblePage - 1)}>Previous</Link>
                : <button className="btn btn-quiet" type="button" disabled>Previous</button>}
              <span>Page {visiblePage} of {totalPages}</span>
              {visiblePage < totalPages
                ? <Link className="btn btn-quiet" href={paymentsHref(filters, visiblePage + 1)}>Next</Link>
                : <button className="btn btn-quiet" type="button" disabled>Next</button>}
            </nav>
          </div>
        </div>
      )}
    </TreasuryPortalShell>
  );
}
