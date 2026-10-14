import { RegistrarUpcomingPickupsPage } from "@/components/registrar-upcoming-pickups-page";
import { getRegistrarPickupSchedule } from "@/lib/server/pickup-scheduling";

export default async function RegistrarUpcomingPickupsRoute() {
  const initialData = await getRegistrarPickupSchedule({ status: "SCHEDULED" });
  return <RegistrarUpcomingPickupsPage initialData={initialData} />;
}
