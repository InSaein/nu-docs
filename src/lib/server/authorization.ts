import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { portalHomePath, type PortalRole } from "@/lib/roles";

export async function requireAuthenticatedSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePortalRole(requiredRole: PortalRole) {
  const session = await requireAuthenticatedSession();

  if (session.role !== requiredRole) {
    redirect(portalHomePath(session.role));
  }

  return session;
}
