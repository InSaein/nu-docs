import Link from "next/link";
import { adminLogout } from "@/lib/server/auth";
import { PortalFooter } from "@/components/app-shell";

const registrarLinks = [
  { icon: "⌂", label: "Dashboard", href: "/registrar/dashboard" },
  { icon: "▣", label: "Request review", href: "/registrar/requests" },
];

export function RegistrarPortalShell({ children }: { children: React.ReactNode }) {
  return <div className="portal-home registrar-portal"><header className="portal-header registrar-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href="/registrar/dashboard" className="registrar-brand" aria-label="NU-Docs Registrar home"><span className="portal-logo">NU</span><span><strong>NU-Docs</strong><small>REGISTRAR PORTAL</small></span></Link></div><div className="portal-account"><span>Registrar account</span><span className="portal-avatar" aria-hidden="true">RA</span></div></header><div className="registrar-shell"><aside className="registrar-sidebar"><nav aria-label="Registrar navigation">{registrarLinks.map((item) => <Link className="registrar-nav-link" href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav><form className="registrar-sidebar-logout" action={adminLogout}><button type="submit">↪ <span>Sign out</span></button></form></aside><main className="registrar-main">{children}</main></div><PortalFooter /></div>;
}

export function RegistrarBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb registrar-breadcrumb" aria-label="Breadcrumb"><Link href="/registrar/dashboard">Registrar Portal</Link><span><b>›</b>{currentPage}</span></nav>;
}
