import { StudentIdentityProvider, type StudentPreviewProfile } from "@/components/student-portal-header";
import { formatDisplayName, getStudentFirstName, getStudentInitials } from "@/lib/display-name";
import { requirePortalRole } from "@/lib/server/authorization";
import { getUserById } from "@/lib/server/users";
import { getOrCreateUserPreferences } from "@/lib/server/user-preferences";
import { UserPreferencesProvider } from "@/components/user-preferences-provider";
import { defaultUserPreferences } from "@/lib/user-preferences";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole("STUDENT");
  const user = await getUserById(session.userId);
  const preferences = user
    ? await getOrCreateUserPreferences(session.userId)
    : defaultUserPreferences;
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

  return (
    <UserPreferencesProvider initialPreferences={preferences}>
      <StudentIdentityProvider firstName={identity.firstName} initials={identity.initials} previewProfile={identity.previewProfile}>
        {children}
      </StudentIdentityProvider>
    </UserPreferencesProvider>
  );
}