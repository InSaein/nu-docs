"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, Breadcrumb, PageHeader, StatusPill } from "@/components/app-shell";
import { getDocumentRequests } from "@/lib/server/requests";

const documentLabels: Record<string, string> = {
  TOR: "Transcript of Records",
  COR: "Certificate of Registration",
  CERTIFICATE_OF_ENROLLMENT: "Certificate of Enrollment",
  CERTIFIED_TRUE_COPY_OF_GRADES: "Certified True Copy of Grades",
};

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

type RegistrarRequest = {
  id: string;
  student: string;
  document: string;
  submitted: string;
  status: string;
};

export default function RegistrarDashboard() {
  const [requests, setRequests] = useState<RegistrarRequest[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [document, setDocument] = useState("All documents");
  useEffect(() => {
    let active = true;
    getDocumentRequests().then((databaseRequests) => {
      if (!active) return;
      setRequests(databaseRequests.map((request) => ({
        id: request.requestNumber,
        student: request.student.name,
        document: documentLabels[request.documentType] ?? request.documentType,
        submitted: request.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        status: statusLabels[request.status] ?? request.status,
      })));
    });
    return () => { active = false; };
  }, []);
  const filtered = requests.filter((request) => `${request.id} ${request.student} ${request.document}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || request.status === status) && (document === "All documents" || request.document === document));
  return <AppShell role="registrar"><Breadcrumb items={["Registrar Portal"]} /><PageHeader eyebrow="Registrar Portal / Request management" title="Registrar Portal" description="Review, process, and release student document requests." /><div className="grid-3 registrar-stats"><div className="surface stat"><span className="muted">Total requests</span><strong className="stat-number">{requests.length}</strong><span className="muted stat-note">This month</span></div><div className="surface stat"><span className="muted">Pending requests</span><strong className="stat-number">{requests.filter((request) => request.status === "Submitted" || request.status === "Under Review").length.toString().padStart(2, "0")}</strong><span className="muted stat-note">Need review</span></div><div className="surface stat"><span className="muted">Processing</span><strong className="stat-number">{requests.filter((request) => request.status === "Processing").length.toString().padStart(2, "0")}</strong><span className="muted stat-note">In progress</span></div><div className="surface stat"><span className="muted">Ready for release</span><strong className="stat-number">{requests.filter((request) => request.status === "Ready for Release").length.toString().padStart(2, "0")}</strong><span className="muted stat-note">Awaiting pickup</span></div><div className="surface stat"><span className="muted">Completed</span><strong className="stat-number">{requests.filter((request) => request.status === "Completed").length.toString().padStart(2, "0")}</strong><span className="muted stat-note">This academic year</span></div></div><div className="section-heading"><h2>Request management</h2><span className="muted" style={{ fontSize: 12 }}>{filtered.length} requests shown</span></div><div className="history-toolbar surface"><label className="toolbar-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, request ID, or document" aria-label="Search requests" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option>All statuses</option><option>Submitted</option><option>Under Review</option><option>Processing</option><option>Ready for Release</option><option>Completed</option><option>Rejected</option></select><select value={document} onChange={(event) => setDocument(event.target.value)} aria-label="Filter by document"><option>All documents</option><option>Transcript of Records</option><option>Certificate of Enrollment</option><option>Certificate of Registration</option><option>Certified True Copy of Grades</option></select></div><div className="surface table-wrap"><table className="data-table registrar-table"><thead><tr><th>Request ID</th><th>Student</th><th>Document</th><th>Date Submitted</th><th>Status</th><th>Assigned To</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><strong>{request.id}</strong></td><td>{request.student}</td><td>{request.document}</td><td>{request.submitted}</td><td><StatusPill tone={request.status}>{request.status}</StatusPill></td><td>Registrar queue</td><td><Link className="link" href={`/registrar/requests/${request.id}`}>Open →</Link></td></tr>)}</tbody></table></div></AppShell>;
}
