import { LoadingSpinner } from "@/components/loading-spinner";
import { isLoadingScreenEnabled } from "@/lib/loading-screen";

export default function TreasuryLoading() {
  return <LoadingSpinner label="Loading Treasury portal" fullPageEnabled={isLoadingScreenEnabled()} />;
}
