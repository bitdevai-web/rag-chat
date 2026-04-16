import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, hashPassword, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  // Users can fetch themselves; admins can fetch anyone
  if (caller.id !== id && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, username, email, role, avatar_url, oauth_provider, created_at FROM users WHERE id = ?")
    .get(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (caller.id !== id && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const db = getDb();
  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.username) { updates.push("username = ?"); vals.push(body.username); }
  if (body.email)    { updates.push("email = ?");    vals.push(body.email); }
  if (body.password) { updates.push("password_hash = ?"); vals.push(await hashPassword(body.password)); }
  if (body.avatar_url !== undefined) { updates.push("avatar_url = ?"); vals.push(body.avatar_url); }
  // Only admins can change roles
  if (body.role && caller.role === "admin") { updates.push("role = ?"); vals.push(body.role); }

  if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...vals);
  auditLog(caller.id, "user_updated", "user", id, { fields: updates });

  return NextResponse.json({ ok: true });
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const id = Number(params.id);
  if (caller.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  auditLog(caller.id, "user_deleted", "user", id);

  return NextResponse.json({ ok: true });
}
