import { LoadingSpinner } from "@/components/loading-spinner";
import { isLoadingScreenEnabled } from "@/lib/loading-screen";

export default function Loading() {
  return <LoadingSpinner label="Loading student portal" fullPageEnabled={isLoadingScreenEnabled()} />;
}
