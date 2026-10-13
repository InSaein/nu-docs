"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { PortalFooter } from "@/components/app-shell";
import { PortalMenuButton, usePortalDrawer } from "@/components/portal-drawer";
import { LoadingSpinner } from "@/components/loading-spinner";
import { logout } from "@/lib/server/auth";

const treasuryLinks = [
  { icon: "⌂", label: "Dashboard", href: "/treasury/dashboard" },
  { icon: "₱", label: "Payments", href: "/treasury/payments" },
  { icon: "▤", label: "Reports", href: "/treasury/reports" },
  { icon: "◷", label: "Payment audit", href: "/treasury/audit" },
];

function TreasuryLogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="registrar-action-loading-button">
      {pending && <LoadingSpinner inline label="Logging out" />}
      <span aria-live="polite">{pending ? "Logging out..." : "Sign out"}</span>
    </button>
  );
}

export function TreasuryPortalShell({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen, menuButtonRef, drawerRef } = usePortalDrawer();

  return (
    <div className="portal-home portal-home-registrar registrar-portal treasury-portal">
      <header className="portal-header registrar-header">
        <div className="portal-brand-group">
          <PortalMenuButton
            isOpen={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            buttonRef={menuButtonRef}
            controls="treasury-navigation-drawer"
          />
          <Link href="/treasury/dashboard" className="registrar-brand" aria-label="NU-Docs Treasury home">
            <span className="portal-logo">NU</span>
            <span><strong>NU-Docs</strong><small>TREASURY PORTAL</small></span>
          </Link>
        </div>
        <div className="portal-account"><span>Treasury account</span><span className="portal-avatar" aria-hidden="true">TA</span></div>
      </header>
      <button
        className="portal-drawer-backdrop"
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isOpen ? 0 : -1}
        hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />
      <div className="registrar-shell">
        <aside
          ref={drawerRef}
          id="treasury-navigation-drawer"
          className={`registrar-sidebar portal-navigation-drawer${isOpen ? " is-open" : ""}`}
          aria-hidden={!isOpen}
          inert={!isOpen}
        >
          <nav aria-label="Treasury navigation">
            {treasuryLinks.map((item) => (
              <Link className="registrar-nav-link" href={item.href} key={item.href} onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <form className="registrar-sidebar-logout" action={logout}>
            <TreasuryLogoutButton />
          </form>
        </aside>
        <main className="registrar-main">{children}</main>
      </div>
      <PortalFooter />
    </div>
  );
}

export function TreasuryBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb registrar-breadcrumb" aria-label="Breadcrumb"><Link href="/treasury/dashboard">Treasury Portal</Link><span><b>›</b>{currentPage}</span></nav>;
}
