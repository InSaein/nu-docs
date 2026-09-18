import Link from "next/link";
import { AppShell, Breadcrumb, PageHeader, StatusPill } from "@/components/app-shell";
import { getRequestHistoryForStudent } from "@/lib/server/requests";

const TEMPORARY_STUDENT_ID = "TEMP-STUDENT-ID";

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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ query?: string; status?: string }> }) {
  const { query = "", status = "All statuses" } = await searchParams;
  const requests = await getRequestHistoryForStudent(TEMPORARY_STUDENT_ID);
  const history = requests.map((request) => ({
    id: request.requestNumber,
    document: documentLabels[request.documentType] ?? request.documentType,
    date: formatDate(request.createdAt),
    status: statusLabels[request.status] ?? request.status,
    lastUpdated: formatDate(request.updatedAt),
  }));
  const filtered = history.filter((request) => `${request.id} ${request.document}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || request.status === status));
  return <AppShell><Breadcrumb items={["NU-Docs", "Request History"]} /><PageHeader eyebrow="NU-Docs / Student services" title="Request History" description="View your previous document requests and completed requests." /><form className="history-toolbar surface" method="get"><label className="toolbar-search"><span aria-hidden="true">⌕</span><input type="search" name="query" defaultValue={query} placeholder="Search request ID or document" aria-label="Search request history" /></label><select name="status" defaultValue={status} aria-label="Filter by status"><option>All statuses</option><option>Processing</option><option>Ready for Release</option><option>Completed</option></select></form><div className="surface table-wrap"><table className="data-table history-table"><thead><tr><th>Request ID</th><th>Document</th><th>Date Requested</th><th>Status</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><strong>{request.id}</strong></td><td>{request.document}</td><td>{request.date}</td><td><StatusPill tone={request.status}>{request.status}</StatusPill></td><td>{request.lastUpdated}</td><td><Link className="link" href={`/student/track?reference=${request.id}`}>View →</Link></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-state">No requests match your search.</p>}</div></AppShell>;
}
