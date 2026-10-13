"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmTreasuryPayment, rejectTreasuryPayment, type PaymentVerificationState } from "@/lib/server/treasury-verification";

const initialState: PaymentVerificationState = {};

export function TreasuryPaymentVerification({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [confirmState, confirmAction, confirming] = useActionState(confirmTreasuryPayment, initialState);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectTreasuryPayment, initialState);

  useEffect(() => {
    if (confirmState.success || rejectState.success) router.refresh();
  }, [confirmState.success, rejectState.success, router]);

  return (
    <section className="surface pad treasury-verification-panel" aria-labelledby="treasury-verification-heading">
      <div className="section-label" id="treasury-verification-heading">Treasury review</div>
      <p className="muted">This records an internal decision for the simulated payment. It does not verify an external transaction.</p>
      <form action={confirmAction}>
        <input type="hidden" name="paymentId" value={paymentId} />
        <button className="btn btn-primary" type="submit" disabled={confirming || rejecting}>
          {confirming ? "Confirming..." : "Confirm Payment"}
        </button>
      </form>
      {confirmState.error && <p className="inline-error" role="alert">{confirmState.error}</p>}
      {confirmState.success && <p className="inline-success" role="status">{confirmState.success}</p>}
      <form className="treasury-rejection-form" action={rejectAction}>
        <input type="hidden" name="paymentId" value={paymentId} />
        <label className="field">
          <span>Rejection reason</span>
          <textarea name="reason" minLength={10} maxLength={1000} required disabled={confirming || rejecting} />
        </label>
        <button className="btn btn-danger" type="submit" disabled={confirming || rejecting}>
          {rejecting ? "Rejecting..." : "Reject Payment"}
        </button>
      </form>
      {rejectState.error && <p className="inline-error" role="alert">{rejectState.error}</p>}
      {rejectState.success && <p className="inline-success" role="status">{rejectState.success}</p>}
    </section>
  );
}
