"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NotificationListItem } from "@/lib/server/notifications";

export function NotificationsList({ notifications, markNotificationAsRead }: { notifications: NotificationListItem[]; markNotificationAsRead: (notificationId: string) => Promise<boolean>; }) {
  const router = useRouter();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(notifications.filter((notification) => notification.isRead).map((notification) => notification.id)));

  const isRead = (notification: NotificationListItem) => notification.isRead || readIds.has(notification.id);

  const markLocalAsRead = (notificationId: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(notificationId);
      return next;
    });
  };

  const restoreLocalUnread = (notificationId: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(notificationId);
      return next;
    });
  };

  const handleHoverRead = async (notification: NotificationListItem) => {
    if (isRead(notification)) {
      return;
    }

    markLocalAsRead(notification.id);
    const success = await markNotificationAsRead(notification.id);
    if (!success) {
      restoreLocalUnread(notification.id);
    }
  };

  const handleArrowClick = async (notification: NotificationListItem) => {
    if (!isRead(notification)) {
      markLocalAsRead(notification.id);
    }

    const success = await markNotificationAsRead(notification.id);
    if (!success && !notification.isRead) {
      restoreLocalUnread(notification.id);
      return;
    }

    if (notification.requestNumber) {
      router.push(`/student/track?reference=${encodeURIComponent(notification.requestNumber)}`);
    }
  };

  return (
    <section className="surface pad student-notifications-panel">
      <div className="student-section-heading">
        <strong>Recent updates</strong>
        <span className="muted">{notifications.filter((notification) => !isRead(notification)).length} unread</span>
      </div>

      {notifications.length === 0 ? (
        <p className="empty-state">You don&apos;t have any notifications yet.</p>
      ) : (
        notifications.map((notification) => {
          const visuallyRead = isRead(notification);

          return (
            <article
              className={`notification ${!visuallyRead ? "notification-unread" : ""}`}
              key={notification.id}
            >
              <div
                className="notification-row"
                onMouseEnter={() => {
                  if (!visuallyRead) {
                    void handleHoverRead(notification);
                  }
                }}
                onClick={() => {
                  if (!visuallyRead && !notification.requestNumber) {
                    void handleHoverRead(notification);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={notification.title}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !visuallyRead && !notification.requestNumber) {
                    event.preventDefault();
                    void handleHoverRead(notification);
                  }
                }}
              >
                <span
                  className="notification-dot"
                  aria-label={visuallyRead ? "Read notification" : "Unread notification"}
                  style={{ opacity: visuallyRead ? 0 : 1 }}
                />

                <div style={{ flex: 1 }}>
                  <div className="notification-head">
                    <strong>{notification.title}</strong>
                  </div>
                  <p className="muted" style={{ fontSize: 13, margin: "6px 0" }}>
                    {notification.message}
                  </p>
                  <small className="muted">
                    {new Date(notification.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </div>

                {notification.requestNumber ? (
                  <button
                    className="notification-arrow"
                    type="button"
                    aria-label={`Open request ${notification.requestNumber}`}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleArrowClick(notification);
                    }}
                  >
                    →
                  </button>
                ) : null}
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
