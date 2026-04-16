import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSessionToken, auditLog, SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/register — admin creates a new user, OR self-registration if
// no users exist yet (first-run bootstrap).
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { username, email, password, role = "member" } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "username, email and password are required" }, { status: 400 });
    }

    // Only admins can set role=admin or create additional users when users already exist
    const totalUsers = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
    if (totalUsers > 0) {
      const caller = getSessionUser(req);
      if (!caller) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      if (caller.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
    if (existing) return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

    const hash = await hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(username, email, hash, totalUsers === 0 ? "admin" : role);

    const newId = Number(result.lastInsertRowid);
    auditLog(newId, "user_registered", "user", newId, { username, email });

    // Auto-login on first-run bootstrap
    if (totalUsers === 0) {
      const token = createSessionToken(newId);
      const res = NextResponse.json({ ok: true, id: newId });
      res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    return NextResponse.json({ ok: true, id: newId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
