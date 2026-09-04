import Link from "next/link";

const studentLinks = [["⌂", "Dashboard", "/student/dashboard"], ["+", "Request document", "/student/request"], ["#", "Track request", "/student/track"], ["≡", "Request history", "/student/history"], ["!", "Notifications", "/student/notifications"]];

export function AppShell({ children, role = "student" }: { children: React.ReactNode; role?: "student" | "registrar" }) {
  const links = role === "registrar" ? [["⌂", "Dashboard", "/registrar/dashboard"], ["▣", "Request review", "/registrar/requests/NU-2026-00421"]] : studentLinks;
  return <div className="app-shell"><aside className="sidebar"><Link href={role === "registrar" ? "/registrar/dashboard" : "/student/dashboard"} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 42 }}><span className="brand-mark">N</span><span><strong>NU-Docs</strong><small style={{ display: "block", color: "#d4d8f0", fontSize: 10, marginTop: 2 }}>{role === "registrar" ? "REGISTRAR PORTAL" : "STUDENT PORTAL"}</small></span></Link><nav>{links.map(([icon, label, href]) => <Link className="sidebar-link" href={href} key={href}><span className="sidebar-icon">{icon}</span><span>{label}</span></Link>)}</nav><div style={{ marginTop: "auto", borderTop: "1px solid #5962a3", paddingTop: 20 }}><Link className="sidebar-link" href="/login"><span className="sidebar-icon">↪</span><span>Sign out</span></Link></div></aside><main className="main-content">{children}</main></div>;
}

export function StatusPill({ children, tone = "processing" }: { children: React.ReactNode; tone?: string }) { return <span className={`status status-${tone}`}>{children}</span>; }
export function SectionHeading({ title, link, href }: { title: string; link?: string; href?: string }) { return <div className="section-heading"><h2>{title}</h2>{link && href && <Link className="link" href={href}>{link} →</Link>}</div>; }