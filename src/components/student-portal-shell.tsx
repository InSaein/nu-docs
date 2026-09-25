import Link from "next/link";
import { logout } from "@/lib/server/auth";
import { PortalFooter } from "@/components/app-shell";

const studentLinks = [
  { icon: "⌂", label: "Dashboard", href: "/student/dashboard" },
  { icon: "+", label: "Request document", href: "/student/request" },
  { icon: "#", label: "Track request", href: "/student/track" },
  { icon: "≡", label: "Request history", href: "/student/history" },
  { icon: "!", label: "Notifications", href: "/student/notifications" },
];

function StudentPortalHeader() {
  return <header className="portal-header student-admin-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href="/student/dashboard" className="student-brand" aria-label="NU-Docs student home"><span className="portal-logo">NU</span><span><strong>NU-Docs</strong><small>STUDENT PORTAL</small></span></Link></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, Saein Marc</span><span className="portal-avatar" aria-hidden="true">SM</span></div></header>;
}

export function StudentBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/student/dashboard">Home</Link><span><b>›</b>{currentPage}</span></nav>;
}

export function StudentPortalShell({ children }: { children: React.ReactNode }) {
  return <div className="portal-home student-admin-portal"><StudentPortalHeader /><div className="student-shell"><aside className="student-sidebar"><nav aria-label="Student navigation">{studentLinks.map((item) => <Link className="student-nav-link" href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav><form className="student-sidebar-logout" action={logout}><button type="submit">↪ <span>Sign out</span></button></form></aside><main className="student-admin-main student-page-main">{children}</main></div><PortalFooter /></div>;
}
