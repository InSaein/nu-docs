import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPreferencesProvider } from "@/components/user-preferences-provider";
import { SettingsClient } from "@/components/settings-client";
import { portalHomePath } from "@/lib/roles";
import { requireAuthenticatedSession } from "@/lib/server/authorization";
import { getOrCreateUserPreferences } from "@/lib/server/user-preferences";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await requireAuthenticatedSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      studentNumber: true,
      course: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const preferences = await getOrCreateUserPreferences(session.userId);

  return (
    <UserPreferencesProvider initialPreferences={preferences}>
      <main className="settings-page">
        <header className="settings-header">
          <Link className="settings-brand" href={portalHomePath(session.role)}>
            <span className="portal-logo" aria-hidden="true">NU</span>
            <span><strong>NU-Docs</strong><small>{user.role} PORTAL</small></span>
          </Link>
          <Link className="settings-back-link" href={portalHomePath(session.role)}>Back to portal</Link>
        </header>
        <SettingsClient
          account={{
            name: user.name,
            email: user.email,
            studentNumber: user.studentNumber,
            course: user.role === "STUDENT" ? user.course : null,
            role: user.role,
          }}
        />
        <footer className="settings-page-footer">NU Docs · Online School Document Request and Tracking System</footer>
      </main>
    </UserPreferencesProvider>
  );
}
