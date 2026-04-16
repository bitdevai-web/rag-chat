import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/documents/[id]/content  — returns full extracted text as ordered chunks
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const db = getDb();
    const doc = db
      .prepare("SELECT id, filename, file_type, size_bytes, status, created_at FROM documents WHERE id = ?")
      .get(id) as { id: number; filename: string; file_type: string; size_bytes: number; status: string; created_at: string } | undefined;
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Pull ordered chunks from FTS (preserves insertion order via chunk_index)
    const chunks = db
      .prepare(
        "SELECT content, chunk_index FROM chunks_fts WHERE document_id = ? ORDER BY chunk_index ASC"
      )
      .all(id) as { content: string; chunk_index: number }[];

    return NextResponse.json({
      document: doc,
      chunks,
      total_chunks: chunks.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
