type NamedUser = {
  name: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
};

export function formatDisplayName(user: NamedUser) {
  if (!user.firstName || !user.lastName) {
    return user.name;
  }

  const middleInitial = user.middleName?.trim().charAt(0);
  return [user.firstName.trim(), middleInitial ? `${middleInitial}.` : "", user.lastName.trim()].filter(Boolean).join(" ");
}

export function getStudentFirstName(user: NamedUser) {
  return user.firstName?.trim().split(/\s+/)[0] || user.name.trim().split(/\s+/)[0] || "Student";
}

export function getStudentInitials(user: NamedUser) {
  const firstName = getStudentFirstName(user);
  const secondName = user.lastName?.trim() || user.name.trim().split(/\s+/)[1] || user.middleName?.trim() || "";
  return `${firstName.charAt(0)}${secondName.charAt(0)}`.toUpperCase();
}
