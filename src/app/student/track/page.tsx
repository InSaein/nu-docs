"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { documentLabels } from "@/lib/document-pricing";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { getAuthenticatedDocumentRequestByRequestNumber } from "@/lib/server/requests";

const stages = ["Submitted", "Under Review", "Processing", "Ready for Release", "Completed"];

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

function TrackPageContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";
  const [searchValue, setSearchValue] = useState(reference);
  const [request, setRequest] = useState<Awaited<ReturnType<typeof getAuthenticatedDocumentRequestByRequestNumber>>>(null);
  const [loading, setLoading] = useState(Boolean(reference.trim()));
  const [notFound, setNotFound] = useState(false);

  const searchRequest = async (requestNumber: string) => {
    const normalizedReference = requestNumber.trim();
    setLoading(true);
    setNotFound(false);
    setRequest(null);
    if (!normalizedReference) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const databaseRequest = await getAuthenticatedDocumentRequestByRequestNumber(normalizedReference);
    setRequest(databaseRequest);
    setNotFound(!databaseRequest);
    setLoading(false);
  };

  useEffect(() => {
    setSearchValue(reference);
    if (reference.trim()) {
      void searchRequest(reference);
    } else {
      setRequest(null);
      setNotFound(false);
      setLoading(false);
    }
  }, [reference]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchRequest(searchValue);
  };

  const status = request ? statusLabels[request.status] ?? request.status : "Submitted";
  const currentStage = Math.max(stages.indexOf(status), 0);
  const requestItems = request?.requestItems ?? [];
  const totalCopies = requestItems.reduce((total, item) => total + item.quantity, 0);
  const legacyDocument = request ? documentLabels[request.documentType] ?? request.documentType : "";
  const submittedDate = request ? new Date(request.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const updatedDate = request ? new Date(request.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const processingFee = requestItems.length
    ? `₱${requestItems.reduce((total, item) => total + Number(item.subtotal), 0).toFixed(2)}`
    : request?.payment?.amount
      ? `₱${Number(request.payment.amount).toFixed(2)}`
      : "Not available";

  return <StudentPortalShell><StudentBreadcrumb currentPage="Track Request" /><PageHeader eyebrow="NU-Docs / Request tracking" title="Track Request" description="Enter a reference number to view the latest request status." /><form className="track-search surface" onSubmit={handleSearch}><div className="field"><label htmlFor="reference">Request reference</label><input id="reference" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Enter request number" /></div><button className="btn btn-primary" type="submit">Search request</button></form>{loading ? <div className="surface pad">Loading request...</div> : notFound ? <div className="surface pad empty-state">No request found for that reference number.</div> : request && <div className="grid-2 track-layout"><section className="surface pad"><div className="request-summary-head"><div><span className="muted">Request reference</span><strong>{request.requestNumber}</strong></div><StatusPill tone={status}>{status}</StatusPill></div><div className="track-section"><h2>Document</h2>{requestItems.length ? <div className="request-item-list">{requestItems.map((item) => <div className="request-item-row" key={item.id}><span>{documentLabels[item.documentType]}</span><strong>{item.quantity} {item.quantity === 1 ? "copy" : "copies"}</strong></div>)}</div> : <div className="request-item-row"><span>{legacyDocument}</span><strong>Quantity not recorded</strong></div>}<div className="request-item-total"><span>Total copies</span><strong>{requestItems.length ? totalCopies : "Not available"}</strong></div></div><dl className="details-list"><div><dt>Date submitted</dt><dd>{submittedDate}</dd></div><div><dt>Last updated</dt><dd>{updatedDate}</dd></div></dl><div className="timeline"><h2>Request timeline</h2>{stages.map((stage, index) => <div className={`timeline-item ${index <= currentStage ? "complete" : ""} ${index === currentStage ? "current" : ""}`} key={stage}><span className="timeline-dot">{index < currentStage ? "✓" : index + 1}</span><div><strong>{stage}</strong><p>{index === currentStage ? "This is the current stage of your request." : index < currentStage ? "Completed" : "Waiting to begin"}</p></div></div>)}</div></section><aside className="surface pad"><span className="eyebrow">Request details</span><div className="info-block"><span className="muted">Purpose</span><strong>{request.purpose}</strong></div><div className="info-block"><span className="muted">Processing fee</span><strong>{processingFee}</strong></div>{request.remarks && <div className="info-block"><span className="muted">Registrar remarks</span><strong>{request.remarks}</strong></div>}<div className="notice notice-blue"><strong>Need help?</strong><br />Visit the Registrar&apos;s Office with your reference number for assistance.</div></aside></div>}</StudentPortalShell>;
}

export default function TrackPage() {
  return <Suspense fallback={<div className="portal-home" />}><TrackPageContent /></Suspense>;
}
