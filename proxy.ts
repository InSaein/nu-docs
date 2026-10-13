import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { portalHomePath, type PortalRole } from "@/lib/roles";

const SESSION_COOKIE_NAME = "nu-docs-session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const requiredRole: PortalRole = request.nextUrl.pathname.startsWith("/student/")
    ? "STUDENT"
    : request.nextUrl.pathname.startsWith("/registrar/")
      ? "REGISTRAR"
      : "TREASURY";

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(portalHomePath(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/registrar/:path*", "/treasury/:path*"],
};
