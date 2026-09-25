"use client";

import Link from "next/link";
import { createContext, useContext } from "react";

const StudentIdentityContext = createContext({ firstName: "Student", initials: "S" });

export function StudentIdentityProvider({ children, firstName, initials }: { children: React.ReactNode; firstName: string; initials: string }) {
  return <StudentIdentityContext.Provider value={{ firstName, initials }}>{children}</StudentIdentityContext.Provider>;
}

export function StudentPortalHeader() {
  const { firstName, initials } = useContext(StudentIdentityContext);

  return <header className="portal-header student-admin-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href="/student/dashboard" className="student-brand" aria-label="NU-Docs student home"><span className="portal-logo">NU</span><span><strong>NU-Docs</strong><small>STUDENT PORTAL</small></span></Link></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, {firstName}</span><span className="portal-avatar" aria-label={`${firstName} initials`}>{initials}</span></div></header>;
}