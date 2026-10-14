"use server";

import { requirePortalRole } from "@/lib/server/authorization";
import { prisma } from "@/lib/prisma";

export type NotificationListItem = {
  id: string;
  type: "REQUEST_SUBMITTED" | "STATUS_UPDATED" | "PAYMENT_SUBMITTED" | "PAYMENT_CONFIRMED" | "PAYMENT_REJECTED" | "PICKUP_SCHEDULED" | "PICKUP_CHANGED" | "PICKUP_CANCELLED";
  title: string;
  message: string;
  isRead: boolean;
  requestNumber: string | null;
  createdAt: string;
  userId: string;
};

export async function getNotificationsForUser() {
  const session = await requirePortalRole("STUDENT");
  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
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
  const session = await requirePortalRole("STUDENT");

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
