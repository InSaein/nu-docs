"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { PortalMenuButton } from "@/components/portal-drawer";

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

export function StudentPortalHeader({
  menuOpen,
  menuButtonRef,
  onMenuToggle,
}: {
  menuOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMenuToggle: () => void;
}) {
  const { firstName, initials } = useContext(StudentIdentityContext);

  return <header className="portal-header student-admin-header"><div className="portal-brand-group"><PortalMenuButton isOpen={menuOpen} onClick={onMenuToggle} buttonRef={menuButtonRef} controls="student-navigation-drawer" /><Link href="/student/dashboard" className="student-brand" aria-label="NU-Docs student home"><span className="portal-logo">NU</span><span><strong>NU-Docs</strong><small>STUDENT PORTAL</small></span></Link></div><div className="portal-account"><Link href="/student/notifications" className="portal-notification" aria-label="View notifications"><span aria-hidden="true">♟</span><i aria-label="Unread notifications" /></Link><span>Hi, {firstName}</span><Link href="/student/profile" className="portal-avatar" aria-label="Open student profile">{initials}</Link></div></header>;
}
