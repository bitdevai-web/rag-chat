import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, auditLog, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ?")
      .get(username, username) as
      | { id: number; username: string; email: string; password_hash: string; role: string }
      | undefined;

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      auditLog(user.id, "login_failed", "user", user.id);
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = createSessionToken(user.id);
    auditLog(user.id, "login", "user", user.id);

    const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
