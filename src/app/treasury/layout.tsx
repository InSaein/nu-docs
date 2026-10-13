import { requirePortalRole } from "@/lib/server/authorization";

export default async function TreasuryLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole("TREASURY");
  return children;
}
