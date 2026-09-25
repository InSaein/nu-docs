import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { NotificationsList } from "@/components/notifications-list";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { getCurrentSession } from "@/lib/auth";
import { getNotificationsForUser, markNotificationAsRead } from "@/lib/server/notifications";

export default async function NotificationsPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const notifications = await getNotificationsForUser(session.userId);

  return <StudentPortalShell><StudentBreadcrumb currentPage="Notifications" /><PageHeader eyebrow="NU-Docs / Student services" title="Notifications" description="Updates about your requests and document releases." /><NotificationsList notifications={notifications} markNotificationAsRead={markNotificationAsRead} /></StudentPortalShell>;
}