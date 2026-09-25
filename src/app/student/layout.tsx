import { StudentIdentityProvider } from "@/components/student-portal-header";
import { getCurrentSession } from "@/lib/auth";
import { getStudentFirstName, getStudentInitials } from "@/lib/display-name";
import { getUserById } from "@/lib/server/users";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const user = session?.role === "STUDENT" ? await getUserById(session.userId) : null;
  const identity = user
    ? { firstName: getStudentFirstName(user), initials: getStudentInitials(user) }
    : { firstName: "Student", initials: "S" };

  return <StudentIdentityProvider firstName={identity.firstName} initials={identity.initials}>{children}</StudentIdentityProvider>;
}