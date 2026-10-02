import { redirect } from "next/navigation";
import { documentLabels } from "@/lib/document-pricing";
import { getCurrentSession } from "@/lib/auth";
import { getRequestHistoryForStudent } from "@/lib/server/requests";
import { StudentTrackPage, type RecentRequestSummary } from "@/components/student-track-page";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  PROCESSING: "Processing",
  READY_FOR_RELEASE: "Ready for Release",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference = "" } = await searchParams;
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const history = reference.trim() ? [] : await getRequestHistoryForStudent(session.userId);
  const recentRequests: RecentRequestSummary[] = history.slice(0, 5).map((request) => {
    const documents = request.requestItems.length
      ? request.requestItems.map((item) => ({
          label: documentLabels[item.documentType] ?? item.documentType,
          quantity: item.quantity,
        }))
      : [{ label: documentLabels[request.documentType] ?? request.documentType, quantity: null }];
    const totalCopies = request.requestItems.length
      ? request.requestItems.reduce((total, item) => total + item.quantity, 0)
      : null;
    const totalAmount = request.requestItems.length
      ? request.requestItems.reduce((total, item) => total + Number(item.subtotal), 0)
      : request.payment?.amount
        ? Number(request.payment.amount)
        : null;

    return {
      requestNumber: request.requestNumber,
      documents,
      totalCopies,
      totalAmount,
      status: statusLabels[request.status] ?? request.status,
      createdAt: request.createdAt,
    };
  });

  return <StudentTrackPage key={reference} initialReference={reference} recentRequests={recentRequests} hasMoreRequests={history.length > 5} />;
}
