import { StudentIdentityProvider, type StudentPreviewProfile } from "@/components/student-portal-header";
import { getCurrentSession } from "@/lib/auth";
import { formatDisplayName, getStudentFirstName, getStudentInitials } from "@/lib/display-name";
import { getUserById } from "@/lib/server/users";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const user = session?.role === "STUDENT" ? await getUserById(session.userId) : null;
  const identity = user
    ? {
        firstName: getStudentFirstName(user),
        initials: getStudentInitials(user),
        previewProfile: {
          fullName: formatDisplayName(user),
          studentNumber: user.studentNumber ?? "Not available",
          course: user.course?.trim() || "Not available",
          email: user.email,
        } satisfies StudentPreviewProfile,
      }
    : {
        firstName: "Student",
        initials: "S",
        previewProfile: { fullName: "Student", studentNumber: "Not available", course: "Not available", email: "Not available" },
      };

  return <StudentIdentityProvider firstName={identity.firstName} initials={identity.initials} previewProfile={identity.previewProfile}>{children}</StudentIdentityProvider>;
}