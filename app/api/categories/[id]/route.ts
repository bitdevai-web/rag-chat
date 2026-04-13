import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteChunksByDocId } from "@/lib/vectordb";

export const dynamic = "force-dynamic";

type Category = { id: number; name: string; description: string; summary: string | null; created_at: string };
type Doc = { id: number };

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const cat = db
      .prepare("SELECT id, name, description, summary, created_at FROM categories WHERE id = ?")
      .get(parseInt(params.id)) as Category | undefined;

    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const doc_count = (
      db.prepare("SELECT COUNT(*) as n FROM documents WHERE category_id = ?").get(cat.id) as { n: number }
    ).n;

    return NextResponse.json({ ...cat, doc_count });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const catId = parseInt(params.id);

    const docs = db
      .prepare("SELECT id FROM documents WHERE category_id = ?")
      .all(catId) as Doc[];

    for (const doc of docs) {
      await deleteChunksByDocId(doc.id);
    }

    db.prepare("DELETE FROM categories WHERE id = ?").run(catId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body = await req.json();
    if (body.summary !== undefined) {
      db.prepare("UPDATE categories SET summary = ? WHERE id = ?").run(body.summary, parseInt(params.id));
    }
    if (body.description !== undefined) {
      db.prepare("UPDATE categories SET description = ? WHERE id = ?").run(body.description, parseInt(params.id));
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
