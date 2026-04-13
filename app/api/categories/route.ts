import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Category = { id: number; name: string; description: string; summary: string | null; created_at: string };
type DocCount = { category_id: number; count: number };

export async function GET() {
  try {
    const db = getDb();
    const categories = db
      .prepare("SELECT id, name, description, summary, created_at FROM categories ORDER BY created_at DESC")
      .all() as Category[];

    const counts = db
      .prepare(
        "SELECT category_id, COUNT(*) as count FROM documents GROUP BY category_id"
      )
      .all() as DocCount[];

    const countMap = Object.fromEntries(counts.map((c) => [c.category_id, c.count]));

    return NextResponse.json(
      categories.map((c) => ({ ...c, doc_count: countMap[c.id] ?? 0 }))
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "Name required" }, { status: 400 });

    const db = getDb();
    const result = db
      .prepare("INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)")
      .run(name.trim(), description?.trim() ?? "");

    const cat = db
      .prepare("SELECT id, name, description, summary, created_at FROM categories WHERE name = ?")
      .get(name.trim()) as Category;

    return NextResponse.json(
      { ...cat, doc_count: 0, created: result.changes > 0 },
      { status: result.changes > 0 ? 201 : 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
