"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, Breadcrumb, PageHeader, StatusPill } from "@/components/app-shell";
import { getDocumentRequestByRequestNumber, updateDocumentRequestStatus } from "@/lib/server/requests";

const statusValues = {
  Submitted: "SUBMITTED",
  "Under Review": "UNDER_REVIEW",
  Processing: "PROCESSING",
  "Ready for Release": "READY_FOR_RELEASE",
  Completed: "COMPLETED",
  Rejected: "REJECTED",
} as const;

const statusLabels = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
} as const;

const documentLabels: Record<string, string> = {
  TOR: "Transcript of Records",
  COR: "Certificate of Registration",
  CERTIFICATE_OF_ENROLLMENT: "Certificate of Enrollment",
  CERTIFIED_TRUE_COPY_OF_GRADES: "Certified True Copy of Grades",
};

type ReviewPageClientProps = {
  requestId: string;
};

export default function ReviewPageClient({ requestId }: ReviewPageClientProps) {
  const [request, setRequest] = useState<Awaited<ReturnType<typeof getDocumentRequestByRequestNumber>>>(null);
  const [status, setStatus] = useState<keyof typeof statusValues>("Submitted");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDocumentRequestByRequestNumber(requestId).then((databaseRequest) => {
      if (!active) return;
      setRequest(databaseRequest);
      if (databaseRequest) setStatus(statusLabels[databaseRequest.status]);
    });
    return () => {
      active = false;
    };
  }, [requestId]);

  const updateStatus = async (nextStatus: keyof typeof statusValues) => {
    if (!request || !window.confirm(`Update this request to ${nextStatus}?`)) return;
    try {
      await updateDocumentRequestStatus({
        requestNumber: request.requestNumber,
        status: statusValues[nextStatus],
        remarks: notes,
      });
      setStatus(nextStatus);
      setError("");
    } catch {
      setError("We could not update this request. Please try again.");
    }
  };

  if (!request) {
    return <AppShell role="registrar"><Breadcrumb items={["Registrar Portal", "Request Review"]} /><PageHeader eyebrow="Registrar Portal / Request review" title={requestId} description="Review student information, requirements, and request status." /><div className="surface pad">Loading request...</div></AppShell>;
  }

  const document = documentLabels[request.documentType] ?? request.documentType;
  const uploadedDocument = request.uploadedDocuments[0];
  const submittedDate = request.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return <AppShell role="registrar"><Breadcrumb items={["Registrar Portal", "Request Review"]} /><PageHeader eyebrow="Registrar Portal / Request review" title={request.requestNumber} description="Review student information, requirements, and request status."><StatusPill tone={status}>{status}</StatusPill></PageHeader><div className="review-layout"><section><div className="surface pad"><div className="section-label">Student information</div><dl className="review-grid"><div><dt>Full name</dt><dd>{request.student.name}</dd></div><div><dt>Student number</dt><dd>{request.student.studentNumber ?? "Not available"}</dd></div><div><dt>Program</dt><dd>Not available</dd></div><div><dt>Year level</dt><dd>Not available</dd></div></dl></div><div className="surface pad review-card"><div className="section-label">Request details</div><dl className="details-list"><div><dt>Requested document</dt><dd>{document}</dd></div><div><dt>Date submitted</dt><dd>{submittedDate}</dd></div><div><dt>Purpose</dt><dd>{request.purpose}</dd></div></dl>{uploadedDocument && <div className="file-row"><span>▧</span><strong>{uploadedDocument.fileName}</strong><span className="muted">Uploaded</span><button className="link" type="button">View</button></div>}</div></section><aside><div className="surface pad"><div className="section-label">Process request</div><div className="field"><label htmlFor="status">Update status</label><select id="status" value={status} onChange={(event) => updateStatus(event.target.value as keyof typeof statusValues)}><option>Submitted</option><option>Under Review</option><option>Processing</option><option>Ready for Release</option><option>Completed</option><option>Rejected</option></select></div><div className="field"><label htmlFor="notes">Internal notes</label><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a note for registrar staff..." /></div>{error && <p className="notice notice-blue">{error}</p>}<button className="btn btn-primary" type="button" onClick={() => window.alert("Internal note saved locally.")}>Save note</button><div className="action-stack"><button className="btn btn-success" type="button" onClick={() => updateStatus("Ready for Release")}>Mark ready for release</button><button className="btn btn-success" type="button" onClick={() => updateStatus("Completed")}>Mark completed</button><button className="btn btn-danger" type="button" onClick={() => updateStatus("Rejected")}>Reject request</button></div></div><Link className="back-link" href="/registrar/dashboard">← Back to request queue</Link></aside></div></AppShell>;
}
