import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

// GET /api/kb/[id]/members — list members of a KB
export async function GET(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = Number(params.id);
  const db = getDb();

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_url, cm.role, cm.added_at
    FROM category_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.category_id = ? ORDER BY cm.added_at ASC
  `).all(catId);

  return NextResponse.json(members);
}

// POST /api/kb/[id]/members — add a member (owner/admin only)
export async function POST(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = Number(params.id);
  const db = getDb();

  // Check caller is owner or admin
  const callerMembership = db
    .prepare("SELECT role FROM category_members WHERE category_id = ? AND user_id = ?")
    .get(catId, caller.id) as { role: string } | undefined;

  if (caller.role !== "admin" && (!callerMembership || callerMembership.role !== "owner")) {
    return NextResponse.json({ error: "Owner or admin required" }, { status: 403 });
  }

  const { username_or_email, role = "viewer" } = await req.json();
  if (!username_or_email) return NextResponse.json({ error: "username_or_email required" }, { status: 400 });

  const user = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username_or_email, username_or_email) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = db.prepare("SELECT 1 FROM category_members WHERE category_id = ? AND user_id = ?").get(catId, user.id);
  if (existing) {
    // Update role
    db.prepare("UPDATE category_members SET role = ? WHERE category_id = ? AND user_id = ?").run(role, catId, user.id);
  } else {
    db.prepare("INSERT INTO category_members (category_id, user_id, role) VALUES (?, ?, ?)").run(catId, user.id, role);
  }

  auditLog(caller.id, "kb_member_added", "category", catId, { user_id: user.id, role });
  return NextResponse.json({ ok: true });
}

// DELETE /api/kb/[id]/members?user_id=X
export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = Number(params.id);
  const userId = Number(req.nextUrl.searchParams.get("user_id"));
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const db = getDb();
  const callerMembership = db
    .prepare("SELECT role FROM category_members WHERE category_id = ? AND user_id = ?")
    .get(catId, caller.id) as { role: string } | undefined;

  if (caller.role !== "admin" && (!callerMembership || callerMembership.role !== "owner")) {
    return NextResponse.json({ error: "Owner or admin required" }, { status: 403 });
  }

  db.prepare("DELETE FROM category_members WHERE category_id = ? AND user_id = ?").run(catId, userId);
  auditLog(caller.id, "kb_member_removed", "category", catId, { user_id: userId });

  return NextResponse.json({ ok: true });
}
