import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { extractText } from "@/lib/parsers";
import { splitIntoChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { addChunks } from "@/lib/vectordb";
import { indexChunks } from "@/lib/fts";
import { getSetting } from "@/lib/settings";
import { runContractComparison, saveComparison } from "@/lib/contractCompare";

export const dynamic = "force-dynamic";

const MAX_DOCS_PER_CATEGORY = 3;

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoryIdParam = formData.get("category_id") as string | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!categoryIdParam)
      return NextResponse.json({ error: "No category_id" }, { status: 400 });

    const categoryId = parseInt(categoryIdParam);
    const db = getDb();

    // Verify ownership of the category
    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
      .get(categoryId, user.id) as { id: number } | undefined;
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // Enforce doc limit
    const existing = db
      .prepare("SELECT COUNT(*) as n FROM documents WHERE category_id = ?")
      .get(cat.id) as { n: number };
    if (existing.n >= MAX_DOCS_PER_CATEGORY) {
      return NextResponse.json(
        { error: `Max ${MAX_DOCS_PER_CATEGORY} documents per category` },
        { status: 400 }
      );
    }

    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());

    // Insert document record as 'processing'
    const { lastInsertRowid: docId } = db
      .prepare(
        "INSERT INTO documents (category_id, filename, file_type, size_bytes, status) VALUES (?, ?, ?, ?, 'processing')"
      )
      .run(cat.id, file.name, file.type || "application/octet-stream", file.size);

    // Process async — fire and forget
    processDocument(
      Number(docId),
      buffer,
      file.type,
      file.name,
      cat.id,
      getSetting("chunk_size"),
      getSetting("chunk_overlap")
    ).catch(console.error);

    return NextResponse.json({ id: Number(docId), status: "processing" });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function processDocument(
  docId: number,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  categoryId: number,
  chunkSizeSetting: string | null,
  overlapSetting: string | null
) {
  const db = getDb();
  const categoryKey = String(categoryId);
  try {
    // 1. Extract text (auto-OCR for image-based PDFs)
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = mimeType === "application/pdf" || ext === "pdf";
    if (isPdf) {
      // Pre-check: if it looks image-based, update status so UI shows "OCR Running"
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const quick = await pdfParse(buffer).catch(() => ({ text: "" }));
      const { isImagePdf } = await import("@/lib/ocr");
      if (isImagePdf(quick.text, buffer.length)) {
        db.prepare("UPDATE documents SET status = 'ocr' WHERE id = ?").run(docId);
      }
    }
    const text = await extractText(buffer, mimeType, filename);

    // 2. Chunk
    const chunkSize = chunkSizeSetting ? parseInt(chunkSizeSetting) : 512;
    const overlap = overlapSetting ? parseInt(overlapSetting) : 50;
    const chunks = splitIntoChunks(text, chunkSize, overlap);

    if (chunks.length === 0) {
      db.prepare("UPDATE documents SET status = 'error' WHERE id = ?").run(docId);
      return;
    }

    // 3. Embed (local model — no API key needed)
    const embeddings = await embedBatch(chunks);

    // 4. Store in LanceDB — use category ID string as the isolation key
    const records = chunks.map((content, i) => ({
      vector: embeddings[i],
      content,
      filename,
      category: categoryKey,
      document_id: docId,
      chunk_index: i,
    }));
    await addChunks(records);

    // 4b. Index chunks for BM25 keyword search (hybrid retrieval)
    indexChunks(chunks, { filename, category: categoryKey, document_id: docId });

    // 5. Mark ready
    db.prepare("UPDATE documents SET status = 'ready' WHERE id = ?").run(docId);

    // 6. Auto-compare against baseline if one exists in this category
    try {
      const baseline = db.prepare(`
        SELECT id, filename FROM documents
        WHERE category_id = (SELECT category_id FROM documents WHERE id = ?)
          AND is_baseline = 1
          AND id != ?
          AND status = 'ready'
        LIMIT 1
      `).get(docId, docId) as { id: number; filename: string } | undefined;

      if (baseline) {
        // Retrieve baseline text from its stored chunks
        const baselineChunks = db.prepare(`
          SELECT content FROM chunks_fts WHERE document_id = ? ORDER BY chunk_index ASC
        `).all(baseline.id) as { content: string }[];
        const baselineText = baselineChunks.map((c) => c.content).join("\n\n");

        if (baselineText.trim()) {
          const result = await runContractComparison(
            baselineText, baseline.filename,
            text, filename
          );
          saveComparison(docId, baseline.id, result);
          console.log(`[upload] Auto-comparison done for doc ${docId}: ${result.riskLevel}`);
        }
      }
    } catch (compareErr) {
      // Don't fail the upload if comparison fails
      console.warn("[upload] Auto-comparison failed:", compareErr);
    }
  } catch (e) {
    console.error("processDocument error:", e);
    db.prepare("UPDATE documents SET status = 'error' WHERE id = ?").run(docId);
  }
}
