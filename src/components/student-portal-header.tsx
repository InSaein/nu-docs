"use client";

import Link from "next/link";
import { createContext, useContext } from "react";

export type StudentPreviewProfile = {
  fullName: string;
  studentNumber: string;
  course: string;
  email: string;
};

type StudentIdentity = {
  firstName: string;
  initials: string;
  previewProfile: StudentPreviewProfile;
};

const StudentIdentityContext = createContext<StudentIdentity>({
  firstName: "Student",
  initials: "S",
  previewProfile: { fullName: "Student", studentNumber: "Not available", course: "Not available", email: "Not available" },
});

export function StudentIdentityProvider({ children, firstName, initials, previewProfile }: { children: React.ReactNode; firstName: string; initials: string; previewProfile: StudentPreviewProfile }) {
  return <StudentIdentityContext.Provider value={{ firstName, initials, previewProfile }}>{children}</StudentIdentityContext.Provider>;
}

export function useStudentIdentity() {
  return useContext(StudentIdentityContext);
}

export function StudentPortalHeader() {
  const { firstName, initials } = useContext(StudentIdentityContext);

  return <header className="portal-header student-admin-header"><div className="portal-brand-group"><button className="portal-menu-button" type="button" aria-label="Open application menu">⠿</button><Link href="/student/dashboard" className="student-brand" aria-label="NU-Docs student home"><span className="portal-logo">NU</span><span><strong>NU-Docs</strong><small>STUDENT PORTAL</small></span></Link></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, {firstName}</span><span className="portal-avatar" aria-label={`${firstName} initials`}>{initials}</span></div></header>;
}