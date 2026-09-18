import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const SESSION_COOKIE_NAME = "nu-docs-session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/registrar/:path*",
};
