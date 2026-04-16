import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/comments?document_id=X  OR  ?conversation_id=X
export async function GET(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const docId  = searchParams.get("document_id");
  const convId = searchParams.get("conversation_id");

  if (!docId && !convId) {
    return NextResponse.json({ error: "document_id or conversation_id required" }, { status: 400 });
  }

  const db = getDb();
  let comments;
  if (docId) {
    comments = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.updated_at,
             u.id AS user_id, u.username, u.avatar_url
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.document_id = ? ORDER BY c.created_at ASC
    `).all(Number(docId));
  } else {
    comments = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.updated_at,
             u.id AS user_id, u.username, u.avatar_url
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.conversation_id = ? ORDER BY c.created_at ASC
    `).all(Number(convId));
  }

  return NextResponse.json(comments);
}

// POST /api/comments
export async function POST(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, document_id, conversation_id } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (!document_id && !conversation_id) {
    return NextResponse.json({ error: "document_id or conversation_id required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO comments (user_id, document_id, conversation_id, content) VALUES (?, ?, ?, ?)"
  ).run(caller.id, document_id ?? null, conversation_id ?? null, content.trim());

  const id = Number(result.lastInsertRowid);
  auditLog(caller.id, "comment_created", document_id ? "document" : "conversation", document_id ?? conversation_id, { id });

  const comment = db.prepare(`
    SELECT c.id, c.content, c.created_at, c.updated_at,
           u.id AS user_id, u.username, u.avatar_url
    FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(id);

  return NextResponse.json(comment, { status: 201 });
}
