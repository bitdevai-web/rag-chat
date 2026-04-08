import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const db = getDb();
    let docs: Doc[];

    if (category) {
      const cat = db
        .prepare("SELECT id FROM categories WHERE name = ?")
        .get(category) as { id: number } | undefined;
      if (!cat) return NextResponse.json([]);

      docs = db
        .prepare(
          "SELECT id, filename, file_type, size_bytes, status, created_at, category_id FROM documents WHERE category_id = ? ORDER BY created_at DESC"
        )
        .all(cat.id) as Doc[];
    } else {
      docs = db
        .prepare(
          "SELECT id, filename, file_type, size_bytes, status, created_at, category_id FROM documents ORDER BY created_at DESC"
        )
        .all() as Doc[];
    }

    return NextResponse.json(docs);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
