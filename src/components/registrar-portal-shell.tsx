"use client";

import Link from "next/link";
import { PortalFooter } from "@/components/app-shell";
import { RegistrarLogoutForm } from "@/components/registrar-logout-form";
import { PortalMenuButton, usePortalDrawer } from "@/components/portal-drawer";

const registrarLinks = [
  { icon: "⌂", label: "Dashboard", href: "/registrar/dashboard" },
  { icon: "▣", label: "Request review", href: "/registrar/requests" },
];

export function RegistrarPortalShell({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen, menuButtonRef, drawerRef } = usePortalDrawer();

  return (
    <div className="portal-home registrar-portal">
      <header className="portal-header registrar-header">
        <div className="portal-brand-group">
          <PortalMenuButton
            isOpen={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            buttonRef={menuButtonRef}
            controls="registrar-navigation-drawer"
          />
          <Link href="/registrar/dashboard" className="registrar-brand" aria-label="NU-Docs Registrar home">
            <span className="portal-logo">NU</span>
            <span><strong>NU-Docs</strong><small>REGISTRAR PORTAL</small></span>
          </Link>
        </div>
        <div className="portal-account"><span>Registrar account</span><span className="portal-avatar" aria-hidden="true">RA</span></div>
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
          id="registrar-navigation-drawer"
          className={`registrar-sidebar portal-navigation-drawer${isOpen ? " is-open" : ""}`}
          aria-hidden={!isOpen}
          inert={!isOpen}
        >
          <nav aria-label="Registrar navigation">
            {registrarLinks.map((item) => (
              <Link className="registrar-nav-link" href={item.href} key={item.href} onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <RegistrarLogoutForm />
        </aside>
        <main className="registrar-main">{children}</main>
      </div>
      <PortalFooter />
    </div>
  );
}

export function RegistrarBreadcrumb({ currentPage }: { currentPage: string }) {
  return <nav className="breadcrumb registrar-breadcrumb" aria-label="Breadcrumb"><Link href="/registrar/dashboard">Registrar Portal</Link><span><b>›</b>{currentPage}</span></nav>;
}
