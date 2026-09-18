"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { createDocumentRequest } from "@/lib/server/requests";

const documents = [
  { name: "Transcript of Records", detail: "Official record of your academic performance", fee: "₱150.00", icon: "▤" },
  { name: "Certificate of Registration", detail: "Proof of your current course registration", fee: "₱50.00", icon: "▧" },
  { name: "Certificate of Enrollment", detail: "Proof that you are currently enrolled", fee: "₱50.00", icon: "▥" },
];

const documentTypes = {
  "Transcript of Records": "TOR",
  "Certificate of Registration": "COR",
  "Certificate of Enrollment": "CERTIFICATE_OF_ENROLLMENT",
} as const;

export default function RequestPage() {
  const [selected, setSelected] = useState(documents[0].name);
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const document = documents.find((item) => item.name === selected) ?? documents[0];
  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionError("");
    const formData = new FormData(event.currentTarget);
    const purpose = String(formData.get("purpose") ?? "");

    try {
      const request = await createDocumentRequest({
        documentType: documentTypes[selected as keyof typeof documentTypes],
        purpose,
      });
      setRequestNumber(request.requestNumber);
      setSubmittedAt(request.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      setSubmitted(true);
    } catch (error) {
      console.error("[NU-Docs] Failed to create document request", {
        documentType: documentTypes[selected as keyof typeof documentTypes],
        error,
      });
      setSubmissionError("We could not submit your request. Please try again.");
    }
  };
  return <StudentPortalShell><StudentBreadcrumb currentPage="Request Document" /><PageHeader eyebrow="NU-Docs / New request" title="Request Documents" description="Select a document and submit your request online." />
    {submitted ? <section className="success-panel"><span className="success-icon">✓</span><span className="eyebrow">Request submitted</span><h2>Your request is on its way.</h2><p>Keep this reference number for tracking and future follow-up.</p><div className="request-reference">{requestNumber}</div><div className="summary-grid"><div><span className="muted">Document</span><strong>{document.name}</strong></div><div><span className="muted">Date submitted</span><strong>{submittedAt}</strong></div><div><span className="muted">Current status</span><strong><StatusPill tone="Submitted">Submitted</StatusPill></strong></div></div><div className="notice notice-blue"><strong>Next steps</strong><br />The Registrar&apos;s Office will review your request and notify you when there is an update.</div><div className="button-row"><Link className="btn btn-primary" href="/student/track">Track this request</Link><Link className="btn btn-secondary" href="/student/nu-docs">Back to NU-Docs</Link></div></section> : <form className="request-layout" onSubmit={submitRequest}><section className="surface pad"><div className="form-heading"><span className="form-step">01</span><div><h2>Choose your document</h2><p className="muted">Select one document type to continue.</p></div></div><div className="document-choices">{documents.map((item) => <label className={`document-choice ${selected === item.name ? "selected" : ""}`} key={item.name}><input type="radio" name="document" checked={selected === item.name} onChange={() => setSelected(item.name)} /><span className="document-icon">{item.icon}</span><span><strong>{item.name}</strong><small>{item.detail}</small></span><em>{item.fee}</em></label>)}</div><div className="form-heading second"><span className="form-step">02</span><div><h2>Request details</h2><p className="muted">Tell us how you will use this document.</p></div></div><div className="field"><label htmlFor="purpose">Purpose of request <b>*</b></label><textarea id="purpose" name="purpose" required placeholder="e.g. For scholarship application" /></div><div className="field"><label htmlFor="copies">Number of copies <b>*</b></label><select id="copies" name="copies" defaultValue="1"><option value="1">1 copy</option><option value="2">2 copies</option><option value="3">3 copies</option></select></div>{submissionError && <p className="notice notice-blue">{submissionError}</p>}</section><aside className="request-aside"><div className="surface pad"><div className="form-heading"><span className="form-step">03</span><div><h2>Student information</h2><p className="muted">We&apos;ll use your portal record.</p></div></div><dl className="details-list"><div><dt>Student ID</dt><dd>2023-161838</dd></div><div><dt>Student name</dt><dd>Hernandez, Saein Marc Castro</dd></div><div><dt>Program</dt><dd>BS Computer Engineering</dd></div></dl><div className="notice"><strong>Before you submit</strong><br />Make sure your purpose is specific. Processing time starts after your request is reviewed.</div><div className="button-row"><button className="btn btn-primary" type="submit">Submit Request</button><Link className="btn btn-secondary" href="/student/nu-docs">Back</Link></div></div></aside></form>}
  </StudentPortalShell>;
}
