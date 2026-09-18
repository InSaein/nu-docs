"use client";

import { useEffect, useState } from "react";
import { AppShell, Breadcrumb, PageHeader, StatusPill } from "@/components/app-shell";
import { getDocumentRequestByRequestNumber } from "@/lib/server/requests";

const stages = ["Submitted", "Under Review", "Processing", "Ready for Release", "Completed"];

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const documentLabels: Record<string, string> = {
  TOR: "Transcript of Records",
  COR: "Certificate of Registration",
  CERTIFICATE_OF_ENROLLMENT: "Certificate of Enrollment",
  CERTIFIED_TRUE_COPY_OF_GRADES: "Certified True Copy of Grades",
};

const initialReference = "NUDOC-2026-18CA844";

export default function TrackPage() {
  const [reference, setReference] = useState(initialReference);
  const [request, setRequest] = useState<Awaited<ReturnType<typeof getDocumentRequestByRequestNumber>>>(null);
  const [loading, setLoading] = useState(true);
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
    const databaseRequest = await getDocumentRequestByRequestNumber(normalizedReference);
    setRequest(databaseRequest);
    setNotFound(!databaseRequest);
    setLoading(false);
  };

  useEffect(() => {
    void searchRequest(initialReference);
  }, []);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchRequest(reference);
  };

  const status = request ? statusLabels[request.status] ?? request.status : "Submitted";
  const currentStage = Math.max(stages.indexOf(status), 0);
  const document = request ? documentLabels[request.documentType] ?? request.documentType : "";
  const submittedDate = request?.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) ?? "";
  const updatedDate = request?.updatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) ?? "";
  const fee = request?.payment?.amount ? `₱${Number(request.payment.amount).toFixed(2)}` : "Not available";

  return <AppShell><Breadcrumb items={["NU-Docs", "Track Request"]} /><PageHeader eyebrow="NU-Docs / Request tracking" title="Track Request" description="Enter a reference number to view the latest request status." /><form className="track-search surface" onSubmit={handleSearch}><div className="field"><label htmlFor="reference">Request reference</label><input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. NUDOC-2026-0001" /></div><button className="btn btn-primary" type="submit">Search request</button></form>{loading ? <div className="surface pad">Loading request...</div> : notFound ? <div className="surface pad empty-state">No request found for that reference number.</div> : request && <div className="grid-2 track-layout"><section className="surface pad"><div className="request-summary-head"><div><span className="muted">Request reference</span><strong>{request.requestNumber}</strong></div><StatusPill tone={status}>{status}</StatusPill></div><dl className="details-list"><div><dt>Document</dt><dd>{document}</dd></div><div><dt>Date submitted</dt><dd>{submittedDate}</dd></div><div><dt>Last updated</dt><dd>{updatedDate}</dd></div></dl><div className="timeline">{stages.map((stage, index) => <div className={`timeline-item ${index <= currentStage ? "complete" : ""} ${index === currentStage ? "current" : ""}`} key={stage}><span className="timeline-dot">{index < currentStage ? "✓" : index + 1}</span><div><strong>{stage}</strong><p>{index === currentStage ? "This is the current stage of your request." : index < currentStage ? "Completed" : "Waiting to begin"}</p></div></div>)}</div></section><aside className="surface pad"><span className="eyebrow">Request details</span><h2 className="summary-title">{document}</h2><div className="info-block"><span className="muted">Purpose</span><strong>{request.purpose}</strong></div><div className="info-block"><span className="muted">Processing fee</span><strong>{fee}</strong></div><div className="notice notice-blue"><strong>Need help?</strong><br />Visit the Registrar&apos;s Office with your reference number for assistance.</div></aside></div>}</AppShell>;
}
