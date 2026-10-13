import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { TreasuryBreadcrumb, TreasuryPortalShell } from "@/components/treasury-portal-shell";
import { TreasuryPaymentVerification } from "@/components/treasury-payment-verification";
import { documentLabels } from "@/lib/document-pricing";
import { getPaymentMethodLabel } from "@/lib/payment-options";
import { getTreasuryPaymentById } from "@/lib/server/treasury-payments";
import { formatTreasuryCurrency, formatTreasuryDate } from "@/lib/treasury-format";

export default async function TreasuryPaymentDetailPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const payment = await getTreasuryPaymentById(paymentId);
  if (!payment) notFound();
  const paymentTone = payment.status === "PAID" ? "approved" : payment.status === "REJECTED" ? "rejected" : "pending";

  return (
    <TreasuryPortalShell>
      <TreasuryBreadcrumb currentPage="Payment review" />
      <PageHeader eyebrow="Treasury Portal / Payment review" title={payment.requestNumber} description="Review recorded payment and associated request information.">
        <StatusPill tone={paymentTone}>{payment.status}</StatusPill>
      </PageHeader>
      <div className="review-layout treasury-payment-detail">
        <section>
          <div className="surface pad">
            <div className="section-label">Student information</div>
            <dl className="review-grid">
              <div><dt>Full name</dt><dd>{payment.studentName}</dd></div>
              <div><dt>Student number</dt><dd>{payment.studentNumber ?? "Not available"}</dd></div>
            </dl>
          </div>
          <div className="surface pad review-card">
            <div className="section-label">Requested items</div>
            {payment.documentItems.length ? (
              <div className="treasury-payment-items">
                {payment.documentItems.map((item, index) => (
                  <div className="treasury-payment-item" key={`${item.documentType}-${index}`}>
                    <div><strong>{documentLabels[item.documentType]}</strong><span>{item.quantity} {item.quantity === 1 ? "copy" : "copies"} × {formatTreasuryCurrency(item.unitPrice)}</span></div>
                    <strong>{formatTreasuryCurrency(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="muted">No request-item breakdown is available.</p>}
            <dl className="details-list treasury-payment-totals">
              <div><dt>Expected amount</dt><dd>{formatTreasuryCurrency(payment.amountDue)}</dd></div>
              <div><dt>Recorded payment amount</dt><dd>{formatTreasuryCurrency(payment.amountPaid)}</dd></div>
            </dl>
          </div>
        </section>
        <section className="surface pad treasury-payment-meta">
          <div className="section-label">Payment information</div>
          <dl className="details-list">
            <div><dt>Payment status</dt><dd><StatusPill tone={paymentTone}>{payment.status}</StatusPill></dd></div>
            <div><dt>Payment method</dt><dd>{getPaymentMethodLabel(payment.method) ?? "Not provided"}</dd></div>
            <div><dt>Simulated application reference</dt><dd className="payment-reference">{payment.transactionReference ?? "Not provided"}</dd></div>
            <div><dt>Payment record created</dt><dd>{formatTreasuryDate(payment.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatTreasuryDate(payment.updatedAt)}</dd></div>
            <div><dt>Paid at</dt><dd>{payment.paidAt ? formatTreasuryDate(payment.paidAt) : "Not recorded"}</dd></div>
            <div><dt>Reviewed at</dt><dd>{payment.reviewedAt ? formatTreasuryDate(payment.reviewedAt) : "Not reviewed"}</dd></div>
            {payment.reviewedByName && <div><dt>Reviewed by</dt><dd>{payment.reviewedByName}</dd></div>}
            {payment.rejectionReason && <div><dt>Rejection reason</dt><dd>{payment.rejectionReason}</dd></div>}
            <div><dt>Request submitted</dt><dd>{formatTreasuryDate(payment.requestCreatedAt)}</dd></div>
          </dl>
        </section>
      </div>
      {payment.status === "PENDING" && <TreasuryPaymentVerification paymentId={payment.id} />}
      <Link className="back-link" href="/treasury/payments">← Back to payments</Link>
    </TreasuryPortalShell>
  );
}
