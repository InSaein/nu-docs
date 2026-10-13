import ReviewPageClient from "./ReviewPageClient";

export default async function ReviewPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <ReviewPageClient key={requestId} requestId={requestId} />;
}
