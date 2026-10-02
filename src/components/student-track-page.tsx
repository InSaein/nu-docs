"use client";

import Link from "next/link";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import type { DocumentType } from "@prisma/client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useStudentIdentity } from "@/components/student-portal-header";
import { documentLabels } from "@/lib/document-pricing";
import { getPaymentMethodLabel, paymentOptions } from "@/lib/payment-options";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { confirmMockPayment, getAuthenticatedDocumentRequestByRequestNumber } from "@/lib/server/requests";

export type RecentRequestSummary = {
  requestNumber: string;
  documents: Array<{ label: string; quantity: number | null }>;
  totalCopies: number | null;
  totalAmount: number | null;
  status: string;
  createdAt: string;
};

type Props = {
  initialReference: string;
  recentRequests: RecentRequestSummary[];
  hasMoreRequests: boolean;
};

const stages = ["Submitted", "Under Review", "Processing", "Ready for Release", "Completed"];

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatPaymentDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RecentRequests({ requests, hasMore }: { requests: RecentRequestSummary[]; hasMore: boolean }) {
  if (!requests.length) {
    return (
      <section className="surface pad student-track-empty-state">
        <h2>No requests yet</h2>
        <p>Your submitted document requests will appear here so you can track their status.</p>
        <Link className="btn btn-primary" href="/student/request">Request a Document</Link>
      </section>
    );
  }

  return (
    <section className="student-recent-requests" aria-labelledby="recent-requests-heading">
      <div className="student-section-heading"><strong id="recent-requests-heading">Recent Requests</strong></div>
      <div className="student-recent-request-list">
        {requests.map((request) => (
          <Link className="surface pad student-recent-request-card" href={{ pathname: "/student/track", query: { reference: request.requestNumber } }} key={request.requestNumber}>
            <div className="student-recent-request-heading">
              <strong>{request.requestNumber}</strong>
              <StatusPill tone={request.status}>{request.status}</StatusPill>
            </div>
            <ul className="student-recent-request-documents">
              {request.documents.map((item, index) => <li key={`${item.label}-${index}`}>{item.label}{item.quantity ? ` × ${item.quantity}` : ""}</li>)}
            </ul>
            <dl className="student-recent-request-details">
              <div><dt>Total copies</dt><dd>{request.totalCopies ?? "Not available"}</dd></div>
              <div><dt>Total amount</dt><dd>{request.totalAmount === null ? "Not available" : `₱${request.totalAmount.toFixed(2)}`}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDate(request.createdAt)}</dd></div>
            </dl>
            <span className="student-recent-request-link">View Request <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
      {hasMore && <div className="student-recent-history-link"><Link className="btn btn-secondary" href="/student/history">View Request History</Link></div>}
    </section>
  );
}

export function StudentTrackPage({ initialReference, recentRequests, hasMoreRequests }: Props) {
  const [searchValue, setSearchValue] = useState(initialReference);
  const [request, setRequest] = useState<Awaited<ReturnType<typeof getAuthenticatedDocumentRequestByRequestNumber>>>(null);
  const [loading, setLoading] = useState(Boolean(initialReference.trim()));
  const [notFound, setNotFound] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [paymentCheckoutOpen, setPaymentCheckoutOpen] = useState(false);
  const [documentPreviewType, setDocumentPreviewType] = useState<DocumentType | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const searchInProgress = useRef(false);
  const paymentInProgress = useRef(false);
  const firstPaymentMethodRef = useRef<HTMLInputElement>(null);
  const payNowButtonRef = useRef<HTMLButtonElement>(null);
  const referenceFromUrl = initialReference.trim();

  const searchRequest = async (requestNumber: string) => {
    const normalizedReference = requestNumber.trim();
    if (!normalizedReference) {
      setSearchError("");
      setRequest(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (searchInProgress.current) return;

    searchInProgress.current = true;
    setLoading(true);
    setSearchError("");
    setNotFound(false);
    setRequest(null);
    setPaymentCheckoutOpen(false);
    setDocumentPreviewType(null);
    setSelectedPaymentMethod(null);
    setPaymentError("");
    setPaymentSuccess("");
    try {
      const databaseRequest = await getAuthenticatedDocumentRequestByRequestNumber(normalizedReference);
      setRequest(databaseRequest);
      setNotFound(!databaseRequest);
    } catch {
      setSearchError("Unable to search right now. Please try again.");
    } finally {
      searchInProgress.current = false;
      setLoading(false);
    }
  };

  const loadReferenceFromUrl = useEffectEvent((reference: string) => {
    void searchRequest(reference);
  });

  useEffect(() => {
    if (referenceFromUrl) loadReferenceFromUrl(referenceFromUrl);
  }, [referenceFromUrl]);

  useEffect(() => {
    if (paymentCheckoutOpen) {
      firstPaymentMethodRef.current?.focus();
    } else {
      payNowButtonRef.current?.focus();
    }
  }, [paymentCheckoutOpen]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchRequest(searchValue);
  };

  const status = request ? statusLabels[request.status] ?? request.status : "Submitted";
  const currentStage = Math.max(stages.indexOf(status), 0);
  const requestItems = request?.requestItems ?? [];
  const requestedPreviewItems = requestItems.length
    ? Array.from(requestItems.reduce((items, item) => {
        items.set(item.documentType, (items.get(item.documentType) ?? 0) + item.quantity);
        return items;
      }, new Map<DocumentType, number>()), ([documentType, quantity]) => ({ documentType, quantity }))
    : request
      ? [{ documentType: request.documentType, quantity: 1 }]
      : [];
  const totalCopies = requestItems.reduce((total, item) => total + item.quantity, 0);
  const requestTotalAmount = requestItems.length
    ? requestItems.reduce((total, item) => total + Number(item.subtotal), 0)
    : request?.payment?.amount !== null && request?.payment?.amount !== undefined
      ? Number(request.payment.amount)
      : null;
  const paymentStatus = request?.payment?.status ?? "UNPAID";
  const paymentIsPaid = paymentStatus === PaymentStatus.PAID;
  const paymentDisplayAmount = paymentIsPaid && request?.payment?.amount !== null && request?.payment?.amount !== undefined
    ? Number(request.payment.amount)
    : requestTotalAmount;
  const legacyDocument = request ? documentLabels[request.documentType] ?? request.documentType : "";
  const submittedDate = request ? new Date(request.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const updatedDate = request ? new Date(request.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const processingFee = requestItems.length
    ? `₱${requestItems.reduce((total, item) => total + Number(item.subtotal), 0).toFixed(2)}`
    : request?.payment?.amount
      ? `₱${Number(request.payment.amount).toFixed(2)}`
      : "Not available";
  const showRecentRequests = !referenceFromUrl && !request && !loading && !notFound;
  const { previewProfile } = useStudentIdentity();

  const confirmPayment = async () => {
    if (!request || !selectedPaymentMethod || paymentInProgress.current) {
      return;
    }

    paymentInProgress.current = true;
    setPaymentSubmitting(true);
    setPaymentError("");

    try {
      const result = await confirmMockPayment(request.requestNumber, selectedPaymentMethod);

      if (!result.success) {
        setPaymentError(result.error);
        return;
      }

      setRequest((currentRequest) => currentRequest
        ? { ...currentRequest, payment: result.payment }
        : currentRequest);
      setPaymentSuccess("Simulated payment confirmed successfully.");
      setPaymentCheckoutOpen(false);
      setSelectedPaymentMethod(null);
    } catch {
      setPaymentError("We could not confirm this simulated payment. Please try again.");
    } finally {
      paymentInProgress.current = false;
      setPaymentSubmitting(false);
    }
  };

  return (
    <StudentPortalShell>
      <StudentBreadcrumb currentPage="Track Request" />
      <PageHeader eyebrow="NU-Docs / Request tracking" title="Track Request" description="Select a recent request or search by request number to view its status." />
      <form className="track-search surface" onSubmit={handleSearch} aria-busy={loading}>
        <div className="field">
          <label htmlFor="reference">Search by request number</label>
          <input id="reference" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Enter request number" />
        </div>
        <button className="btn btn-primary student-action-loading-button" type="submit" disabled={loading} aria-busy={loading}>
          {loading && <LoadingSpinner inline label="Searching" />}
          {loading ? "Searching..." : "Search request"}
        </button>
      </form>
      {searchError && <p className="notice notice-blue" role="alert">{searchError}</p>}
      {loading ? (
        <div className="surface pad" role="status" aria-live="polite" aria-busy="true">Loading request...</div>
      ) : notFound ? (
        <div className="surface pad empty-state">No request found for that reference number.</div>
      ) : request ? (
        <div className="grid-2 track-layout">
          <section className="surface pad">
            <div className="request-summary-head">
              <div><span className="muted">Request reference</span><strong>{request.requestNumber}</strong></div>
              <StatusPill tone={status}>{status}</StatusPill>
            </div>
            <div className="track-section">
              <h2>Document</h2>
              {requestItems.length ? (
                <div className="request-item-list">{requestItems.map((item) => <div className="request-item-row" key={item.id}><span>{documentLabels[item.documentType]}</span><strong>{item.quantity} {item.quantity === 1 ? "copy" : "copies"}</strong></div>)}</div>
              ) : (
                <div className="request-item-row"><span>{legacyDocument}</span><strong>Quantity not recorded</strong></div>
              )}
              <div className="request-item-total"><span>Total copies</span><strong>{requestItems.length ? totalCopies : "Not available"}</strong></div>
              {(request.status === "READY_FOR_RELEASE" || request.status === "COMPLETED") && requestedPreviewItems.length > 0 && (
                <button className="btn btn-secondary" type="button" onClick={() => setDocumentPreviewType(requestedPreviewItems[0].documentType)}>
                  View Requested Documents
                </button>
              )}
            </div>
            <dl className="details-list">
              <div><dt>Date submitted</dt><dd>{submittedDate}</dd></div>
              <div><dt>Last updated</dt><dd>{updatedDate}</dd></div>
            </dl>
            <div className="timeline">
              <h2>Request timeline</h2>
              {stages.map((stage, index) => <div className={`timeline-item ${index <= currentStage ? "complete" : ""} ${index === currentStage ? "current" : ""}`} key={stage}><span className="timeline-dot">{index < currentStage ? "✓" : index + 1}</span><div><strong>{stage}</strong><p>{index === currentStage ? "This is the current stage of your request." : index < currentStage ? "Completed" : "Waiting to begin"}</p></div></div>)}
            </div>
          </section>
          <aside className="surface pad">
            <span className="eyebrow">Request details</span>
            <div className="info-block"><span className="muted">Purpose</span><strong>{request.purpose}</strong></div>
            <div className="info-block"><span className="muted">Processing fee</span><strong>{processingFee}</strong></div>
            {(request.status === "PROCESSING" || request.payment) && (
              <section className="track-section payment-section" aria-labelledby="payment-heading">
                <h2 id="payment-heading">Payment</h2>
                <dl className="payment-details">
                  <div><dt>Payment status</dt><dd><strong>{paymentStatus}</strong></dd></div>
                  <div><dt>{paymentIsPaid ? "Amount" : "Amount due"}</dt><dd>{paymentDisplayAmount === null ? "Not available" : `₱${paymentDisplayAmount.toFixed(2)}`}</dd></div>
                  {paymentIsPaid && request.payment?.method && <div><dt>Payment method</dt><dd>{getPaymentMethodLabel(request.payment.method)}</dd></div>}
                  {paymentIsPaid && request.payment?.transactionReference && <div><dt>Transaction reference</dt><dd className="payment-reference">{request.payment.transactionReference}</dd></div>}
                  {paymentIsPaid && request.payment?.paidAt && <div><dt>Paid</dt><dd>{formatPaymentDate(request.payment.paidAt)}</dd></div>}
                </dl>
                {!paymentIsPaid && paymentStatus === PaymentStatus.PENDING && <p className="muted payment-pending-note">A payment is pending confirmation.</p>}
                {request.status === "PROCESSING" && !paymentIsPaid && !request.payment && requestTotalAmount !== null && (
                  <button
                    ref={payNowButtonRef}
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setPaymentError("");
                      setPaymentSuccess("");
                      setPaymentCheckoutOpen(true);
                    }}
                  >
                    Pay Now
                  </button>
                )}
                {paymentSuccess && <p className="inline-success" role="status">{paymentSuccess}</p>}
                {paymentError && !paymentCheckoutOpen && <p className="notice notice-blue" role="alert">{paymentError}</p>}
              </section>
            )}
            {request.remarks && <div className="info-block"><span className="muted">Registrar remarks</span><strong>{request.remarks}</strong></div>}
            <div className="notice notice-blue"><strong>Need help?</strong><br />Visit the Registrar&apos;s Office with your reference number for assistance.</div>
          </aside>
        </div>
      ) : showRecentRequests ? (
        <RecentRequests requests={recentRequests} hasMore={hasMoreRequests} />
      ) : null}
      {paymentCheckoutOpen && request && (
        <div
          className="payment-modal-overlay"
          onClick={() => {
            if (!paymentSubmitting) setPaymentCheckoutOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !paymentSubmitting) setPaymentCheckoutOpen(false);
          }}
        >
          <section
            className="payment-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mock-payment-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="mock-payment-title">Mock Payment</h2>
            <p className="payment-disclaimer">This is a simulated payment for demonstration purposes. No real payment will be processed.</p>
            <div className="payment-dialog-amount">
              <span>Amount Due</span>
              <strong>{requestTotalAmount === null ? "Not available" : `₱${requestTotalAmount.toFixed(2)}`}</strong>
            </div>
            <fieldset className="payment-methods">
              <legend className="sr-only">Select a simulated payment method</legend>
              {([
                ["E-Wallets", paymentOptions.eWallets],
                ["Online Banking", paymentOptions.onlineBanking],
              ] as const).map(([groupLabel, options]) => (
                <div className="payment-method-group" key={groupLabel}>
                  <h3>{groupLabel}</h3>
                  <div className="payment-method-options">
                    {options.map((option, index) => (
                      <label className="payment-method-option" key={option.value}>
                        <input
                          ref={groupLabel === "E-Wallets" && index === 0 ? firstPaymentMethodRef : undefined}
                          type="radio"
                          name="simulated-payment-method"
                          value={option.value}
                          checked={selectedPaymentMethod === option.value}
                          onChange={() => setSelectedPaymentMethod(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>
            {paymentError && <p className="notice notice-blue" role="alert">{paymentError}</p>}
            <div className="payment-dialog-actions">
              <button
                className="btn btn-secondary"
                type="button"
                disabled={paymentSubmitting}
                onClick={() => {
                  setPaymentCheckoutOpen(false);
                  setSelectedPaymentMethod(null);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="button" disabled={!selectedPaymentMethod || paymentSubmitting} onClick={() => void confirmPayment()}>
                {paymentSubmitting ? "Processing Payment..." : "Confirm Simulated Payment"}
              </button>
            </div>
          </section>
        </div>
      )}
      {request && (
        <DocumentPreviewModal
          documentType={documentPreviewType}
          requestedDocuments={requestedPreviewItems}
          student={previewProfile}
          showWatermark={false}
          onDocumentTypeChange={setDocumentPreviewType}
          onClose={() => setDocumentPreviewType(null)}
        />
      )}
    </StudentPortalShell>
  );
}
