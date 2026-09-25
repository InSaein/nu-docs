"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { RegistrarBreadcrumb, RegistrarPortalShell } from "@/components/registrar-portal-shell";
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
  const [success, setSuccess] = useState("");

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
    if (!request) return;
    try {
      setSuccess("");
      await updateDocumentRequestStatus({
        requestNumber: request.requestNumber,
        status: statusValues[nextStatus],
        remarks: notes,
      });
      setStatus(nextStatus);
      setError("");
      setSuccess("Request status updated successfully.");
    } catch {
      setError("We could not update this request. Please try again.");
    }
  };

  if (!request) {
    return <RegistrarPortalShell><RegistrarBreadcrumb currentPage="Request Review" /><PageHeader eyebrow="Registrar Portal / Request review" title={requestId} description="Review student information, requirements, and request status." /><div className="surface pad">Loading request...</div></RegistrarPortalShell>;
  }

  const document = documentLabels[request.documentType] ?? request.documentType;
  const requestItems = request.requestItems;
  const documents = requestItems.length ? requestItems.map((item) => `${documentLabels[item.documentType]} — ${item.quantity} ${item.quantity === 1 ? "copy" : "copies"}`).join(", ") : document;
  const totalAmount = requestItems.reduce((total, item) => total + Number(item.subtotal), 0);
  const uploadedDocument = request.uploadedDocuments[0];
  const submittedDate = new Date(request.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return <RegistrarPortalShell><RegistrarBreadcrumb currentPage="Request Review" /><PageHeader eyebrow="Registrar Portal / Request review" title={request.requestNumber} description="Review student information, requirements, and request status."><StatusPill tone={status}>{status}</StatusPill></PageHeader><div className="review-layout"><section><div className="surface pad"><div className="section-label">Student information</div><dl className="review-grid"><div><dt>Full name</dt><dd>{request.student.name}</dd></div><div><dt>Student number</dt><dd>{request.student.studentNumber ?? "Not available"}</dd></div><div><dt>Course</dt><dd>{request.student.course || "Not provided"}</dd></div><div><dt>Email</dt><dd>{request.student.email}</dd></div></dl></div><div className="surface pad review-card"><div className="section-label">Request details</div><dl className="details-list"><div><dt>Requested documents</dt><dd>{documents}</dd></div><div><dt>Total amount</dt><dd>{requestItems.length ? `₱${totalAmount.toFixed(2)}` : "Not available"}</dd></div><div><dt>Date submitted</dt><dd>{submittedDate}</dd></div><div><dt>Purpose</dt><dd>{request.purpose}</dd></div></dl>{uploadedDocument && <div className="file-row"><span>▧</span><strong>{uploadedDocument.fileName}</strong><span className="muted">Uploaded</span><button className="link" type="button">View</button></div>}</div></section><aside><div className="surface pad"><div className="section-label">Process request</div><div className="field"><label htmlFor="status">Update status</label><select id="status" value={status} onChange={(event) => updateStatus(event.target.value as keyof typeof statusValues)}><option>Submitted</option><option>Under Review</option><option>Processing</option><option>Ready for Release</option><option>Completed</option><option>Rejected</option></select></div>{success && <p className="inline-success" role="status">✓ {success}</p>}<div className="field"><label htmlFor="notes">Internal notes</label><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a note for registrar staff..." /></div>{error && <p className="notice notice-blue">{error}</p>}<div className="action-stack"><button className="btn btn-primary" type="button" onClick={() => { setError(""); setSuccess("Internal notes saved successfully."); }}>Save note</button></div></div><Link className="back-link" href="/registrar/dashboard">← Back to request queue</Link></aside></div></RegistrarPortalShell>;
}
