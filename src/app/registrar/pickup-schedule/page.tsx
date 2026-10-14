import { RegistrarPickupSchedulePage } from "@/components/registrar-pickup-schedule-page";
import { getRegistrarPickupConfiguration } from "@/lib/server/pickup-scheduling";

export default async function RegistrarPickupScheduleRoute() {
  const initialData = await getRegistrarPickupConfiguration();
  return <RegistrarPickupSchedulePage initialData={initialData} />;
}
