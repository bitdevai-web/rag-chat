import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { deleteChunksByDocId } from "@/lib/vectordb";

export const dynamic = "force-dynamic";

type Category = { id: number; name: string; description: string; summary: string | null; created_at: string };
type Doc = { id: number };

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const cat = db
      .prepare("SELECT id, name, description, summary, created_at FROM categories WHERE id = ? AND owner_id = ?")
      .get(parseInt(params.id), user.id) as Category | undefined;

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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const catId = parseInt(params.id);

    // Verify ownership
    const cat = db.prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?").get(catId, user.id);
    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const catId = parseInt(params.id);

    // Verify ownership
    const cat = db.prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?").get(catId, user.id);
    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    if (body.summary !== undefined) {
      db.prepare("UPDATE categories SET summary = ? WHERE id = ?").run(body.summary, catId);
    }
    if (body.description !== undefined) {
      db.prepare("UPDATE categories SET description = ? WHERE id = ?").run(body.description, catId);
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
