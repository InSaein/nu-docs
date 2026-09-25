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
