import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { StudentProfileForm } from "@/components/student-profile-form";
import { StudentBreadcrumb, StudentPortalShell } from "@/components/student-portal-shell";
import { getCurrentSession } from "@/lib/auth";
import { getStudentInitials } from "@/lib/display-name";
import { getUserById } from "@/lib/server/users";

export default async function StudentProfilePage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const user = await getUserById(session.userId);
  if (!user || user.role !== "STUDENT") {
    redirect("/login");
  }

  return (
    <StudentPortalShell>
      <StudentBreadcrumb currentPage="Profile" />
      <PageHeader eyebrow="NU-Docs / Student services" title="My Profile" description="View and update your student contact and academic details." />
      <StudentProfileForm
        profile={{
          firstName: user.firstName ?? "",
          middleName: user.middleName ?? "",
          lastName: user.lastName ?? "",
          nameExtension: user.nameExtension ?? "",
          course: user.course ?? "",
          email: user.email,
        }}
        studentNumber={user.studentNumber ?? "Not available"}
        initials={getStudentInitials(user)}
      />
    </StudentPortalShell>
  );
}
