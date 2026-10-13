import { requirePortalRole } from "@/lib/server/authorization";

export default async function RegistrarLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole("REGISTRAR");
  return children;
}
