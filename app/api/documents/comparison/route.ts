/**
 * GET /api/documents/comparison?document_id=123
 * Returns the stored comparison result for a given document.
 */
import { NextRequest, NextResponse } from "next/server";
import { getComparison } from "@/lib/contractCompare";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const docId = Number(req.nextUrl.searchParams.get("document_id"));
  if (!docId) return NextResponse.json({ error: "document_id required" }, { status: 400 });

  const comparison = getComparison(docId);
  if (!comparison) return NextResponse.json(null);
  return NextResponse.json(comparison);
}
