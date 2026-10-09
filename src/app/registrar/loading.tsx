import { LoadingSpinner } from "@/components/loading-spinner";
import { isLoadingScreenEnabled } from "@/lib/loading-screen";

export default function Loading() {
  return <LoadingSpinner label="Loading registrar portal" fullPageEnabled={isLoadingScreenEnabled()} />;
}
