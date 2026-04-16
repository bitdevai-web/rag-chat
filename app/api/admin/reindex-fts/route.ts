import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractText } from "@/lib/parsers";
import { splitIntoChunks } from "@/lib/chunker";
import { indexChunks } from "@/lib/fts";
import { getSetting } from "@/lib/settings";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reindex-fts
 * One-shot utility to rebuild the FTS5 keyword index from existing
 * LanceDB-only documents. Re-reads files from disk is not possible
 * (we don't keep the raw files), so we re-extract from LanceDB's
 * content column by reading each chunk row.
 */
export async function POST(_req: NextRequest) {
  try {
    const db = getDb();

    // Clear the FTS table first
    db.exec("DELETE FROM chunks_fts");

    // Pull chunks straight from LanceDB via a scan
    const lancedb = await import("@lancedb/lancedb");
    const lanceDir = path.join(process.cwd(), "data", "lancedb");
    if (!fs.existsSync(lanceDir)) {
      return NextResponse.json({ reindexed: 0, note: "LanceDB not initialized" });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (lancedb as any).connect(lanceDir);
    const names: string[] = await conn.tableNames();
    if (!names.includes("chunks")) return NextResponse.json({ reindexed: 0 });
    const table = await conn.openTable("chunks");

    // Scan all rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iter = (await table.query().limit(100000).toArray()) as Array<{
      content: string;
      filename: string;
      category: string;
      document_id: number;
      chunk_index: number;
    }>;

    // Group by document and insert via indexChunks (preserving order)
    const byDoc = new Map<number, { filename: string; category: string; rows: { idx: number; content: string }[] }>();
    for (const r of iter) {
      if (!byDoc.has(r.document_id)) {
        byDoc.set(r.document_id, { filename: r.filename, category: r.category, rows: [] });
      }
      byDoc.get(r.document_id)!.rows.push({ idx: r.chunk_index, content: r.content });
    }

    let total = 0;
    for (const [docId, group] of Array.from(byDoc.entries())) {
      group.rows.sort((a, b) => a.idx - b.idx);
      indexChunks(group.rows.map((r) => r.content), {
        filename: group.filename,
        category: group.category,
        document_id: docId,
      });
      total += group.rows.length;
    }

    // Mention settings to keep the import used
    void getSetting("llm_provider");

    return NextResponse.json({ reindexed: total, documents: byDoc.size });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
