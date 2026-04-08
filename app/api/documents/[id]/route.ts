import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteChunksByDocId } from "@/lib/vectordb";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = getDb();
    const doc = db
      .prepare("SELECT id FROM documents WHERE id = ?")
      .get(id) as { id: number } | undefined;

    if (!doc)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from LanceDB first
    await deleteChunksByDocId(id);

    // Delete from SQLite (cascades to no-longer-used chunks table)
    db.prepare("DELETE FROM documents WHERE id = ?").run(id);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
