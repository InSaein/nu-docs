"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DocumentType } from "@prisma/client";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { documentLabels, documentPricing } from "@/lib/document-pricing";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { createDocumentRequest } from "@/lib/server/requests";

const documents: Array<{ type: DocumentType; detail: string; icon: string }> = [
  { type: "TOR", detail: "Official record of your academic performance", icon: "▤" },
  { type: "COR", detail: "Proof of your current course registration", icon: "▧" },
  { type: "CERTIFICATE_OF_ENROLLMENT", detail: "Proof that you are currently enrolled", icon: "▥" },
  { type: "CERTIFIED_TRUE_COPY_OF_GRADES", detail: "Certified copy of your academic grades", icon: "▥" },
];

export default function RequestPage() {
  const [quantities, setQuantities] = useState<Record<DocumentType, number>>({ TOR: 0, COR: 0, CERTIFICATE_OF_ENROLLMENT: 0, CERTIFIED_TRUE_COPY_OF_GRADES: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  const selectedItems = useMemo(() => documents.filter((document) => quantities[document.type] > 0), [quantities]);
  const totalCopies = selectedItems.reduce((total, document) => total + quantities[document.type], 0);
  const totalAmount = selectedItems.reduce((total, document) => total + quantities[document.type] * documentPricing[document.type], 0);

  const changeQuantity = (documentType: DocumentType, change: number) => {
    setQuantities((current) => ({ ...current, [documentType]: Math.max(0, current[documentType] + change) }));
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionError("");
    if (!selectedItems.length) {
      setSubmissionError("Please select at least one document.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const purpose = String(formData.get("purpose") ?? "");

    try {
      const request = await createDocumentRequest({
        items: selectedItems.map((document) => ({ documentType: document.type, quantity: quantities[document.type] })),
        purpose,
      });
      setRequestNumber(request.requestNumber);
      setSubmittedAt(new Date(request.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      setSubmitted(true);
    } catch (error) {
      console.error("[NU-Docs] Failed to create document request", { error });
      setSubmissionError("We could not submit your request. Please try again.");
    }
  };

  return <StudentPortalShell><StudentBreadcrumb currentPage="Request Document" /><PageHeader eyebrow="NU-Docs / New request" title="Request Documents" description="Select one or more documents and submit your request online." />
    {submitted ? <section className="success-panel"><span className="success-icon">✓</span><span className="eyebrow">Request submitted</span><h2>Your request is on its way.</h2><p>Keep this reference number for tracking and future follow-up.</p><div className="request-reference">{requestNumber}</div><div className="summary-grid"><div><span className="muted">Documents</span><strong>{totalCopies} copies</strong></div><div><span className="muted">Date submitted</span><strong>{submittedAt}</strong></div><div><span className="muted">Current status</span><strong><StatusPill tone="Submitted">Submitted</StatusPill></strong></div></div><div className="notice notice-blue"><strong>Next steps</strong><br />The Registrar&apos;s Office will review your request and notify you when there is an update.</div><div className="button-row"><Link className="btn btn-primary" href={`/student/track?reference=${encodeURIComponent(requestNumber)}`}>Track this request</Link><Link className="btn btn-secondary" href="/student/dashboard">Back to Dashboard</Link></div></section> : <form className="request-layout" onSubmit={submitRequest}><section className="surface pad"><div className="form-heading"><span className="form-step">01</span><div><h2>Choose your documents</h2><p className="muted">Set the quantity for each document you need.</p></div></div><div className="document-choices">{documents.map((document) => { const quantity = quantities[document.type]; return <div className={`document-choice quantity-choice ${quantity > 0 ? "selected" : ""}`} key={document.type}><span className="document-icon">{document.icon}</span><span><strong>{documentLabels[document.type]}</strong><small>{document.detail}</small></span><em>₱{documentPricing[document.type].toFixed(2)}</em><div className="quantity-control"><button type="button" onClick={() => changeQuantity(document.type, -1)} disabled={quantity === 0} aria-label={`Decrease ${documentLabels[document.type]} quantity`}>−</button><output aria-label={`${documentLabels[document.type]} quantity`}>{quantity}</output><button type="button" onClick={() => changeQuantity(document.type, 1)} aria-label={`Increase ${documentLabels[document.type]} quantity`}>+</button></div></div>; })}</div><div className="request-total"><div><span className="muted">Selected Documents</span>{selectedItems.length ? <ul>{selectedItems.map((document) => <li key={document.type}>{documentLabels[document.type]} — {quantities[document.type]} {quantities[document.type] === 1 ? "copy" : "copies"}</li>)}</ul> : <p className="muted">No documents selected</p>}</div><div className="request-total-values"><span>Total Copies: <strong>{totalCopies}</strong></span><span>Total Amount: <strong>₱{totalAmount.toFixed(2)}</strong></span></div></div><div className="form-heading second"><span className="form-step">02</span><div><h2>Request details</h2><p className="muted">Tell us how you will use these documents.</p></div></div><div className="field"><label htmlFor="purpose">Purpose of request <b>*</b></label><textarea id="purpose" name="purpose" required placeholder="e.g. For scholarship application" /></div>{submissionError && <p className="notice notice-blue" role="alert">{submissionError}</p>}<div className="button-row"><button className="btn btn-primary" type="submit">Submit Request</button><Link className="btn btn-secondary" href="/student/dashboard">Back</Link></div></section><aside className="request-aside"><div className="surface pad"><div className="form-heading"><span className="form-step">03</span><div><h2>Student information</h2><p className="muted">We&apos;ll use your portal record.</p></div></div><dl className="details-list"><div><dt>Student ID</dt><dd>Authenticated student</dd></div><div><dt>Request items</dt><dd>{totalCopies} copies selected</dd></div><div><dt>Total amount</dt><dd>₱{totalAmount.toFixed(2)}</dd></div></dl><div className="notice"><strong>Before you submit</strong><br />Choose at least one document and make sure your purpose is specific.</div></div></aside></form>}
  </StudentPortalShell>;
}
