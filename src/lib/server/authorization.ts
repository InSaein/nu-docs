import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { portalHomePath, type PortalRole } from "@/lib/roles";

export async function requirePortalRole(requiredRole: PortalRole) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== requiredRole) {
    redirect(portalHomePath(session.role));
  }

  return session;
}
