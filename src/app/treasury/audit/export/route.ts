import { NextRequest, NextResponse } from "next/server";
import { csvCell, csvDocument } from "@/lib/csv";
import { requirePortalRole } from "@/lib/server/authorization";
import { getTreasuryAuditExport } from "@/lib/server/treasury-reports";

export async function GET(request: NextRequest) {
  await requirePortalRole("TREASURY");
  const params = request.nextUrl.searchParams;
  const result = await getTreasuryAuditExport({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    action: params.get("action") ?? undefined,
    status: params.get("status") ?? undefined,
    query: params.get("q") ?? undefined,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const rows = result.entries.map((entry) => [
    csvCell(entry.createdAt),
    csvCell(entry.requestNumber, true),
    csvCell(entry.studentNumber ?? "", true),
    csvCell(entry.paymentId, true),
    csvCell(entry.action),
    csvCell(entry.previousStatus),
    csvCell(entry.newStatus),
    csvCell(entry.actorName, true),
    csvCell(entry.rejectionReason ?? "", true),
    csvCell(entry.isBackfilled ? "Backfilled" : "Live"),
  ]);
  const body = csvDocument(
    ["Date/time (UTC)", "Request number", "Student number", "Payment ID", "Action", "Previous status", "Resulting status", "Treasury user", "Rejection reason", "Record source"],
    rows,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nu-docs-payment-audit.csv"',
      "Cache-Control": "private, no-store",
      "X-Export-Truncated": String(result.truncated),
    },
  });
}
