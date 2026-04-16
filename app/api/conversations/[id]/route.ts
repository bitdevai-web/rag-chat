import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/conversations/[id]  — fetch a thread with its messages
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const db = getDb();
    const conv = db
      .prepare("SELECT id, category_id, title, created_at, updated_at FROM conversations WHERE id = ?")
      .get(id);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = db
      .prepare(
        "SELECT id, role, content, sources, suggestions, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
      )
      .all(id);

    return NextResponse.json({ conversation: conv, messages });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/conversations/[id]  { title }  — rename thread
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { title } = await req.json();
    const db = getDb();
    db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title || "Untitled", id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]  — remove thread + its messages
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const db = getDb();
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
    db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
