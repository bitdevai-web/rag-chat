/**
 * POST /api/documents/baseline
 * Body: { document_id: number }
 * Sets a document as the baseline for its category.
 * Clears any previous baseline in the same category.
 * Then re-runs comparison for all non-baseline ready docs in that category.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runContractComparison, saveComparison } from "@/lib/contractCompare";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { document_id } = await req.json();
    if (!document_id) return NextResponse.json({ error: "document_id required" }, { status: 400 });

    const db = getDb();

    // Get the doc + its category
    const doc = db.prepare("SELECT id, category_id, filename, status FROM documents WHERE id = ?")
      .get(document_id) as { id: number; category_id: number; filename: string; status: string } | undefined;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.status !== "ready") return NextResponse.json({ error: "Document must be fully processed before setting as baseline" }, { status: 400 });

    // Clear previous baseline in this category
    db.prepare("UPDATE documents SET is_baseline = 0 WHERE category_id = ?").run(doc.category_id);
    // Set this doc as baseline
    db.prepare("UPDATE documents SET is_baseline = 1 WHERE id = ?").run(document_id);

    // Retrieve baseline text from chunks
    const baselineChunks = db.prepare(`
      SELECT content FROM chunks_fts WHERE document_id = ? ORDER BY chunk_index ASC
    `).all(document_id) as { content: string }[];
    const baselineText = baselineChunks.map((c) => c.content).join("\n\n");

    if (!baselineText.trim()) {
      return NextResponse.json({ ok: true, recompared: 0, warning: "Baseline set but no chunk text found to compare against" });
    }

    // Re-run comparison for all other ready docs in the category (fire async)
    const otherDocs = db.prepare(`
      SELECT id, filename FROM documents
      WHERE category_id = ? AND id != ? AND status = 'ready' AND is_baseline = 0
    `).all(doc.category_id, document_id) as { id: number; filename: string }[];

    let recompared = 0;
    for (const other of otherDocs) {
      try {
        const chunks = db.prepare(`
          SELECT content FROM chunks_fts WHERE document_id = ? ORDER BY chunk_index ASC
        `).all(other.id) as { content: string }[];
        const incomingText = chunks.map((c) => c.content).join("\n\n");
        if (!incomingText.trim()) continue;

        const result = await runContractComparison(baselineText, doc.filename, incomingText, other.filename);
        saveComparison(other.id, document_id, result);
        recompared++;
      } catch (e) {
        console.warn(`[baseline] Failed to compare doc ${other.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, recompared });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
