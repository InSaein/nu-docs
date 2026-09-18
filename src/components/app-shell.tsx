import Link from "next/link";
import { logout } from "@/lib/server/auth";

type Role = "student" | "registrar";
type NavItem = { icon: string; label: string; href: string };

export function PortalHeader({ role = "student" }: { role?: Role }) {
  const home = role === "registrar" ? "/registrar/dashboard" : "/student/dashboard";
  return <header className="portal-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href={home} className="portal-logo" aria-label="NUIS Baliwag home">NU</Link><strong>NUIS BALIWAG</strong></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, Saein Marc</span><span className="portal-avatar" aria-hidden="true">SM</span></div></header>;
}

export function PortalFooter() { return <footer className="portal-footer"><span>National University © 2018 - 2026</span><Link href="/student/dashboard">Privacy Policy</Link></footer>; }

const studentLinks: NavItem[] = [{ icon: "⌂", label: "Dashboard", href: "/student/dashboard" }, { icon: "+", label: "Request document", href: "/student/request" }, { icon: "#", label: "Track request", href: "/student/track" }, { icon: "≡", label: "Request history", href: "/student/history" }, { icon: "!", label: "Notifications", href: "/student/notifications" }];
const registrarLinks: NavItem[] = [{ icon: "⌂", label: "Dashboard", href: "/registrar/dashboard" }, { icon: "▣", label: "Request review", href: "/registrar/requests/NU-2026-00421" }];

export function AppShell({ children, role = "student" }: { children: React.ReactNode; role?: Role }) {
  const links = role === "registrar" ? registrarLinks : studentLinks;
  return <div className={`portal-home portal-home-${role}`}><PortalHeader role={role} /><div className="app-shell"><aside className="sidebar"><Link href={role === "registrar" ? "/registrar/dashboard" : "/student/dashboard"} className="sidebar-brand"><span className="brand-mark">N</span><span><strong>NU-Docs</strong><small>{role === "registrar" ? "REGISTRAR PORTAL" : "STUDENT PORTAL"}</small></span></Link><nav>{links.map((item) => <Link className="sidebar-link" href={item.href} key={item.href}><span className="sidebar-icon">{item.icon}</span><span>{item.label}</span></Link>)}</nav><div className="sidebar-exit"><form action={logout}><button className="sidebar-link sidebar-logout" type="submit"><span className="sidebar-icon">↪</span><span>Sign out</span></button></form></div></aside><main className="main-content">{children}</main></div><PortalFooter /></div>;
}

export function StatusPill({ children, tone = "processing" }: { children: React.ReactNode; tone?: string }) { return <span className={`status status-${tone.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>; }
export function Breadcrumb({ items }: { items: string[] }) { return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/student/dashboard">Home</Link>{items.map((item) => <span key={item}><b>›</b>{item}</span>)}</nav>; }
export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) { return <header className="topbar"><div><span className="eyebrow">{eyebrow}</span><h1 className="page-title">{title}</h1><p className="muted">{description}</p></div>{children}</header>; }
export function SectionHeading({ title, link, href }: { title: string; link?: string; href?: string }) { return <div className="section-heading"><h2>{title}</h2>{link && href && <Link className="link" href={href}>{link} →</Link>}</div>; }