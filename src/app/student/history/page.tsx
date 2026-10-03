import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { StudentHistoryFilters } from "@/components/student-history-filters";
import { documentLabels } from "@/lib/document-pricing";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { getCurrentSession } from "@/lib/auth";
import { getRequestHistoryForStudent } from "@/lib/server/requests";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const statusOptions = [
  { value: RequestStatus.SUBMITTED, label: "Submitted" },
  { value: RequestStatus.UNDER_REVIEW, label: "Under Review" },
  { value: RequestStatus.PROCESSING, label: "Processing" },
  { value: RequestStatus.READY_FOR_RELEASE, label: "Ready for Release" },
  { value: RequestStatus.COMPLETED, label: "Completed" },
  { value: RequestStatus.REJECTED, label: "Rejected" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ query?: string; status?: string }> }) {
  const { query = "", status = "" } = await searchParams;
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }
  const requests = await getRequestHistoryForStudent(session.userId);
  const selectedStatus = statusOptions.find((option) => option.value === status)?.value ?? "";
  const history = requests.map((request) => ({
    id: request.requestNumber,
    document: request.requestItems.length ? request.requestItems.map((item) => `${documentLabels[item.documentType]} — ${item.quantity}`).join(", ") : documentLabels[request.documentType] ?? request.documentType,
    date: formatDate(request.createdAt),
    statusValue: request.status,
    status: statusLabels[request.status] ?? request.status,
    lastUpdated: formatDate(request.updatedAt),
  }));
  const filtered = history.filter((request) => `${request.id} ${request.document}`.toLowerCase().includes(query.toLowerCase()) && (!selectedStatus || request.statusValue === selectedStatus));
  return <StudentPortalShell><StudentBreadcrumb currentPage="Request History" /><PageHeader eyebrow="NU-Docs / Student services" title="Request History" description="View your previous document requests and completed requests." /><StudentHistoryFilters query={query} status={selectedStatus} statusOptions={statusOptions} /><div className="surface table-wrap"><table className="data-table history-table"><thead><tr><th>Request ID</th><th>Document</th><th>Date Requested</th><th>Status</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}><td><strong>{request.id}</strong></td><td>{request.document}</td><td>{request.date}</td><td><StatusPill tone={request.status}>{request.status}</StatusPill></td><td>{request.lastUpdated}</td><td><Link className="link" href={`/student/track?reference=${encodeURIComponent(request.id)}`}>View →</Link></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-state">No requests match your search.</p>}</div></StudentPortalShell>;
}
