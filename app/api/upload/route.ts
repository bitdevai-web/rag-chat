import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractText } from "@/lib/parsers";
import { splitIntoChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { addChunks } from "@/lib/vectordb";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_DOCS_PER_CATEGORY = 3;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!category)
      return NextResponse.json({ error: "No category" }, { status: 400 });

    const db = getDb();

    // Resolve or create category
    let cat = db
      .prepare("SELECT id FROM categories WHERE name = ?")
      .get(category) as { id: number } | undefined;
    if (!cat) {
      db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(category);
      cat = db
        .prepare("SELECT id FROM categories WHERE name = ?")
        .get(category) as { id: number };
    }

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
      category,
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
  category: string,
  chunkSizeSetting: string | null,
  overlapSetting: string | null
) {
  const db = getDb();
  try {
    // 1. Extract text
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

    // 4. Store in LanceDB
    const records = chunks.map((content, i) => ({
      vector: embeddings[i],
      content,
      filename,
      category,
      document_id: docId,
      chunk_index: i,
    }));
    await addChunks(records);

    // 5. Mark ready
    db.prepare("UPDATE documents SET status = 'ready' WHERE id = ?").run(docId);
  } catch (e) {
    console.error("processDocument error:", e);
    db.prepare("UPDATE documents SET status = 'error' WHERE id = ?").run(docId);
  }
}
