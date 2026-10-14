"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalFooter } from "@/components/app-shell";
import { RegistrarLogoutForm } from "@/components/registrar-logout-form";
import { PortalMenuButton, usePortalDrawer } from "@/components/portal-drawer";
import { PortalSettingsLink } from "@/components/portal-settings-link";

const registrarLinks = [
  { icon: "⌂", label: "Dashboard", href: "/registrar/dashboard" },
  { icon: "▣", label: "Request review", href: "/registrar/requests" },
  { icon: "◷", label: "Pickup schedule", href: "/registrar/pickup-schedule" },
  { icon: "▤", label: "Upcoming Pickups", href: "/registrar/upcoming-pickups" },
];

export function RegistrarPortalShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isDesktop, setIsOpen, menuButtonRef, drawerRef } = usePortalDrawer();
  const pathname = usePathname();

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
          aria-hidden={!isOpen && !isDesktop}
          inert={!isOpen && !isDesktop}
        >
          <nav aria-label="Registrar navigation">
            {registrarLinks.map((item) => (
              <Link
                className="registrar-nav-link"
                href={item.href}
                key={item.href}
                aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                onClick={() => setIsOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <div className="portal-sidebar-actions">
            <PortalSettingsLink />
            <RegistrarLogoutForm />
          </div>
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
