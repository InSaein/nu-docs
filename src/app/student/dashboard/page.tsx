import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { getCurrentSession } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/server/notifications";
import { getRequestHistoryForStudent } from "@/lib/server/requests";
import { getUserById } from "@/lib/server/users";
import { formatDisplayName } from "@/lib/display-name";

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

const activeStatuses = ["SUBMITTED", "UNDER_REVIEW", "PROCESSING", "READY_FOR_RELEASE"];
const summaryStatuses = ["SUBMITTED", "UNDER_REVIEW", "PROCESSING", "READY_FOR_RELEASE", "COMPLETED"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function StudentDashboard() {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const [user, requests, notifications] = await Promise.all([
    getUserById(session.userId),
    getRequestHistoryForStudent(session.userId),
    getNotificationsForUser(session.userId),
  ]);

  if (!user) {
    redirect("/login");
  }

  const activeRequests = requests.filter((request) => activeStatuses.includes(request.status)).slice(0, 5);
  const completedRequests = requests.filter((request) => request.status === "COMPLETED").slice(0, 5);
  const recentNotifications = notifications.slice(0, 3);

  return <StudentPortalShell><StudentBreadcrumb currentPage="Dashboard" /><PageHeader eyebrow="NU-Docs / Student services" title={`Welcome back, ${user.name}`} description="Keep track of your document requests and student service updates." /><section className="student-profile-panel surface"><div><span className="eyebrow">Student profile</span><h2>{user.name}</h2></div><dl><div><dt>Student number</dt><dd>{user.studentNumber ?? "Not available"}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div></dl></section><section className="student-dashboard-section"><div className="student-section-heading"><h2>Request Status</h2><span className="muted">Your current document requests</span></div><div className="student-status-grid">{summaryStatuses.map((requestStatus) => <div className={`student-status-card status-${requestStatus.toLowerCase().replaceAll("_", "-")}`} key={requestStatus}><span>{statusLabels[requestStatus]}</span><strong>{requests.filter((request) => request.status === requestStatus).length}</strong></div>)}</div></section><div className="student-dashboard-columns"><section className="student-dashboard-section surface dashboard-panel"><div className="student-section-heading"><h2>Active Requests</h2><Link className="link" href="/student/request">Request a Document →</Link></div>{activeRequests.length === 0 ? <p className="empty-state">You don&apos;t have any active document requests.</p> : <div className="dashboard-table-wrap"><table className="data-table dashboard-table"><thead><tr><th>Request Number</th><th>Document</th><th>Status</th><th>Date Requested</th><th>Action</th></tr></thead><tbody>{activeRequests.map((request) => <tr key={request.id}><td><strong>{request.requestNumber}</strong></td><td>{documentLabels[request.documentType] ?? request.documentType}</td><td><span className={`status status-${statusLabels[request.status].toLowerCase().replaceAll(" ", "-")}`}>{statusLabels[request.status]}</span></td><td>{formatDate(request.createdAt)}</td><td><Link className="link" href={`/student/track?reference=${encodeURIComponent(request.requestNumber)}`}>Track →</Link></td></tr>)}</tbody></table></div>}</section><section className="student-dashboard-section surface dashboard-panel"><div className="student-section-heading"><h2>Recent Notifications</h2><Link className="link" href="/student/notifications">View All →</Link></div>{recentNotifications.length === 0 ? <p className="empty-state">You don&apos;t have any notifications yet.</p> : <div className="dashboard-notification-list">{recentNotifications.map((notification) => <article className="dashboard-notification" key={notification.id}><span className="notification-dot" aria-hidden="true" /><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{formatDate(notification.createdAt)} · {notification.type === "STATUS_UPDATED" ? "Request status update" : "Request submitted"}</small></div></article>)}</div>}</section></div><section className="student-quick-action surface"><div><span className="eyebrow">Need another document?</span><h2>Request a Document</h2><p className="muted">Start a new request and submit your purpose online.</p></div><Link className="btn btn-primary" href="/student/request">Request a Document</Link></section><section className="student-dashboard-section surface dashboard-panel"><div className="student-section-heading"><h2>Recently Completed</h2><Link className="link" href="/student/history">View History →</Link></div>{completedRequests.length === 0 ? <p className="empty-state">You don&apos;t have any completed requests yet.</p> : <div className="dashboard-table-wrap"><table className="data-table dashboard-table"><thead><tr><th>Request Number</th><th>Document</th><th>Completed Date</th><th>Action</th></tr></thead><tbody>{completedRequests.map((request) => <tr key={request.id}><td><strong>{request.requestNumber}</strong></td><td>{documentLabels[request.documentType] ?? request.documentType}</td><td>{formatDate(request.completedAt ?? request.updatedAt)}</td><td><Link className="link" href={`/student/track?reference=${encodeURIComponent(request.requestNumber)}`}>View →</Link></td></tr>)}</tbody></table></div>}</section></StudentPortalShell>;
}
