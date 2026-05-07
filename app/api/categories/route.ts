import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getDb();
    const categories = db.prepare(
      "SELECT id, name, description, summary, created_at FROM categories WHERE owner_id = ? ORDER BY created_at DESC"
    ).all(user.id) as { id: number; name: string; description: string; summary: string | null; created_at: string }[];

    const counts = db.prepare(
      "SELECT category_id, COUNT(*) as count FROM documents WHERE category_id IN (SELECT id FROM categories WHERE owner_id = ?) GROUP BY category_id"
    ).all(user.id) as { category_id: number; count: number }[];

    const countMap = Object.fromEntries(counts.map((c) => [c.category_id, c.count]));
    return NextResponse.json(categories.map((c) => ({ ...c, doc_count: countMap[c.id] ?? 0 })));
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, description } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO categories (name, description, owner_id) VALUES (?, ?, ?)"
    ).run(name.trim(), description?.trim() ?? "", user.id);

    const cat = db.prepare(
      "SELECT id, name, description, summary, created_at FROM categories WHERE id = ?"
    ).get(result.lastInsertRowid) as { id: number; name: string; description: string; summary: string | null; created_at: string };

    return NextResponse.json({ ...cat, doc_count: 0, created: true }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) return NextResponse.json({ error: "A KB with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
