import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, hashPassword, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const db = getDb();
  const users = db
    .prepare("SELECT id, username, email, role, avatar_url, oauth_provider, created_at FROM users ORDER BY created_at ASC")
    .all();
  return NextResponse.json(users);
}

// POST /api/users — create user (admin only)
export async function POST(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { username, email, password, role = "member" } = await req.json();
  if (!username || !email || !password) {
    return NextResponse.json({ error: "username, email and password are required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
  if (existing) return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

  const hash = await hashPassword(password);
  const result = db
    .prepare("INSERT INTO users (username, email, password_hash, role, invited_by) VALUES (?, ?, ?, ?, ?)")
    .run(username, email, hash, role, caller.id);

  const newId = Number(result.lastInsertRowid);
  auditLog(caller.id, "user_created", "user", newId, { username, email, role });

  return NextResponse.json({ ok: true, id: newId }, { status: 201 });
}
