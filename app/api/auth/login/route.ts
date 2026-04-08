import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_USERNAME = process.env.LOGIN_USERNAME || "admin";
const VALID_PASSWORD = process.env.LOGIN_PASSWORD || "admin123";
const SESSION_TOKEN   = "rag_session";
const SECRET          = process.env.SESSION_SECRET || "rag-chat-secret-2024";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Simple signed token: base64(username:timestamp:secret)
    const payload = Buffer.from(`${username}:${Date.now()}:${SECRET}`).toString("base64");

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_TOKEN, payload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // 7 days
      maxAge: 60 * 60 * 24 * 7,
      // secure: true in production (set via env)
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
