import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

// PATCH /api/comments/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const db = getDb();
  const comment = db.prepare("SELECT user_id FROM comments WHERE id = ?").get(id) as { user_id: number } | undefined;
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.user_id !== caller.id && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  db.prepare("UPDATE comments SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content.trim(), id);
  auditLog(caller.id, "comment_updated", "comment", id);

  return NextResponse.json({ ok: true });
}

// DELETE /api/comments/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const db = getDb();
  const comment = db.prepare("SELECT user_id FROM comments WHERE id = ?").get(id) as { user_id: number } | undefined;
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.user_id !== caller.id && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  db.prepare("DELETE FROM comments WHERE id = ?").run(id);
  auditLog(caller.id, "comment_deleted", "comment", id);

  return NextResponse.json({ ok: true });
}
