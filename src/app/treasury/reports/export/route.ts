import { NextRequest, NextResponse } from "next/server";
import { csvCell, csvDocument } from "@/lib/csv";
import { requirePortalRole } from "@/lib/server/authorization";
import { getTreasuryCollectionExport } from "@/lib/server/treasury-reports";

export async function GET(request: NextRequest) {
  await requirePortalRole("TREASURY");
  const params = request.nextUrl.searchParams;
  const result = await getTreasuryCollectionExport(params.get("from") ?? undefined, params.get("to") ?? undefined);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const rows = result.rows.map((row) => [
    csvCell(row.confirmedAt),
    csvCell(row.requestNumber, true),
    csvCell(row.method, true),
    csvCell(row.amount),
    csvCell(row.applicationReference, true),
  ]);
  const body = csvDocument(["Confirmed at (UTC)", "Request number", "Payment method", "Amount", "Simulated application reference"], rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nu-docs-collections.csv"',
      "Cache-Control": "private, no-store",
      "X-Export-Truncated": String(result.truncated),
    },
  });
}
