"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NotificationListItem = {
  id: string;
  type: "REQUEST_SUBMITTED" | "STATUS_UPDATED";
  title: string;
  message: string;
  isRead: boolean;
  requestNumber: string | null;
  createdAt: string;
  userId: string;
};

export async function getNotificationsForUser(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    requestNumber: notification.requestNumber,
    createdAt: notification.createdAt.toISOString(),
    userId: notification.userId,
  })) satisfies NotificationListItem[];
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification || notification.userId !== session.userId) {
    return false;
  }

  if (notification.isRead) {
    return true;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return true;
}
