import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/conversations?category_id=<id>  — list threads for a KB
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id");
    if (!category_id) return NextResponse.json({ error: "No category_id" }, { status: 400 });

    const db = getDb();

    // Verify ownership
    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
      .get(parseInt(category_id), user.id) as { id: number } | undefined;
    if (!cat) return NextResponse.json([]);

    const rows = db
      .prepare(
        `SELECT c.id, c.title, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
         FROM conversations c
         WHERE c.category_id = ?
         ORDER BY c.updated_at DESC`
      )
      .all(cat.id);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/conversations  { category_id, title? }  — create new thread
export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category_id, title } = await req.json();
    if (!category_id) return NextResponse.json({ error: "No category_id" }, { status: 400 });

    const db = getDb();

    // Verify ownership
    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
      .get(category_id, user.id) as { id: number } | undefined;
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const { lastInsertRowid } = db
      .prepare("INSERT INTO conversations (category_id, title, owner_id) VALUES (?, ?, ?)")
      .run(cat.id, title || "New conversation", user.id);

    const conv = db
      .prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?")
      .get(Number(lastInsertRowid));

    return NextResponse.json(conv);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
