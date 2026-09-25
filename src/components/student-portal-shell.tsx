import Link from "next/link";
import { StudentPortalHeader } from "@/components/student-portal-header";
import { logout } from "@/lib/server/auth";
import { PortalFooter } from "@/components/app-shell";

const studentLinks = [
  { icon: "⌂", label: "Dashboard", href: "/student/dashboard" },
  { icon: "+", label: "Request document", href: "/student/request" },
  { icon: "#", label: "Track request", href: "/student/track" },
  { icon: "≡", label: "Request history", href: "/student/history" },
  { icon: "!", label: "Notifications", href: "/student/notifications" },
];

export function StudentBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/student/dashboard">Home</Link><span><b>›</b>{currentPage}</span></nav>;
}

export function StudentPortalShell({ children }: { children: React.ReactNode }) {
  return <div className="portal-home student-admin-portal"><StudentPortalHeader /><div className="student-shell"><aside className="student-sidebar"><nav aria-label="Student navigation">{studentLinks.map((item) => <Link className="student-nav-link" href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav><form className="student-sidebar-logout" action={logout}><button type="submit">↪ <span>Sign out</span></button></form></aside><main className="student-admin-main student-page-main">{children}</main></div><PortalFooter /></div>;
}
