"use client";

import Link from "next/link";
import { StudentPortalHeader } from "@/components/student-portal-header";
import { StudentLogoutForm } from "@/components/student-logout-form";
import { PortalFooter } from "@/components/app-shell";
import { usePortalDrawer } from "@/components/portal-drawer";

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
  const { isOpen, setIsOpen, menuButtonRef, drawerRef } = usePortalDrawer();

  return (
    <div className="portal-home student-admin-portal">
      <StudentPortalHeader
        menuOpen={isOpen}
        menuButtonRef={menuButtonRef}
        onMenuToggle={() => setIsOpen((open) => !open)}
      />
      <button
        className="portal-drawer-backdrop"
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isOpen ? 0 : -1}
        hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />
      <div className="student-shell">
        <aside
          ref={drawerRef}
          id="student-navigation-drawer"
          className={`student-sidebar portal-navigation-drawer${isOpen ? " is-open" : ""}`}
          aria-hidden={!isOpen}
          inert={!isOpen}
        >
          <nav aria-label="Student navigation">
            {studentLinks.map((item) => (
              <Link className="student-nav-link" href={item.href} key={item.href} onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <StudentLogoutForm />
        </aside>
        <main className="student-admin-main student-page-main">{children}</main>
      </div>
      <PortalFooter />
    </div>
  );
}
