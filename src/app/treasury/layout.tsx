import { requirePortalRole } from "@/lib/server/authorization";
import { getOrCreateUserPreferences } from "@/lib/server/user-preferences";
import { UserPreferencesProvider } from "@/components/user-preferences-provider";

export default async function TreasuryLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole("TREASURY");
  const preferences = await getOrCreateUserPreferences(session.userId);
  return <UserPreferencesProvider initialPreferences={preferences}>{children}</UserPreferencesProvider>;
}
