import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Doc = {
  id: number;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: string;
  created_at: string;
  category_id: number;
};

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id");

    const db = getDb();

    if (category_id) {
      // Verify ownership
      const cat = db
        .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
        .get(parseInt(category_id), user.id) as { id: number } | undefined;
      if (!cat) return NextResponse.json([]);

      const docs = db
        .prepare(
          "SELECT id, filename, file_type, size_bytes, status, created_at, category_id FROM documents WHERE category_id = ? ORDER BY created_at DESC"
        )
        .all(cat.id) as Doc[];
      return NextResponse.json(docs);
    } else {
      // Return all docs for this user's categories
      const docs = db
        .prepare(
          `SELECT d.id, d.filename, d.file_type, d.size_bytes, d.status, d.created_at, d.category_id
           FROM documents d
           JOIN categories c ON c.id = d.category_id
           WHERE c.owner_id = ?
           ORDER BY d.created_at DESC`
        )
        .all(user.id) as Doc[];
      return NextResponse.json(docs);
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
