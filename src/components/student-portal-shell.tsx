import Link from "next/link";
import { PortalFooter } from "@/components/app-shell";

function StudentPortalHeader() {
  return <header className="portal-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href="/student/nu-docs" className="portal-brand-link" aria-label="NU-Docs home"><span className="portal-logo">NU</span><strong>NUIS BALIWAG</strong></Link></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, Saein Marc</span><span className="portal-avatar" aria-hidden="true">SM</span></div></header>;
}

export function StudentBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/student/dashboard">Home</Link><span><b>›</b><Link href="/student/nu-docs">NU-Docs</Link></span><span><b>›</b>{currentPage}</span></nav>;
}

export function StudentPortalShell({ children }: { children: React.ReactNode }) {
  return <div className="portal-home"><StudentPortalHeader /><main className="portal-main student-page-main">{children}</main><PortalFooter /></div>;
}
