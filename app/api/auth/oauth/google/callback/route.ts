import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSessionToken, auditLog, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/oauth/google/callback
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("oauth_state")?.value;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!code || state !== storedState) {
    return NextResponse.redirect(`${base}/login?error=oauth_failed`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${base}/api/auth/oauth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return NextResponse.redirect(`${base}/login?error=oauth_token_failed`);

    // Fetch user info
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as { id: string; email: string; name: string; picture?: string };

    const db = getDb();
    // Find or create user
    let user = db
      .prepare("SELECT id, username, role FROM users WHERE oauth_provider = 'google' AND oauth_id = ?")
      .get(profile.id) as { id: number; username: string; role: string } | undefined;

    if (!user) {
      // Try match by email
      const byEmail = db.prepare("SELECT id, username, role FROM users WHERE email = ?").get(profile.email) as
        | { id: number; username: string; role: string }
        | undefined;
      if (byEmail) {
        // Link OAuth to existing account
        db.prepare("UPDATE users SET oauth_provider = 'google', oauth_id = ?, avatar_url = ? WHERE id = ?")
          .run(profile.id, profile.picture ?? null, byEmail.id);
        user = byEmail;
      } else {
        // Create new user (first Google login = member, unless first user ever = admin)
        const totalUsers = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
        const username = profile.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_");
        const result = db.prepare(
          "INSERT INTO users (username, email, role, avatar_url, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, 'google', ?)"
        ).run(username, profile.email, totalUsers === 0 ? "admin" : "member", profile.picture ?? null, profile.id);
        user = { id: Number(result.lastInsertRowid), username, role: totalUsers === 0 ? "admin" : "member" };
      }
    }

    const token = createSessionToken(user.id);
    auditLog(user.id, "oauth_login", "user", user.id, { provider: "google" });

    const res = NextResponse.redirect(`${base}/dashboard`);
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure: process.env.NODE_ENV === "production" });
    res.cookies.delete("oauth_state");
    return res;
  } catch (e) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(`${base}/login?error=oauth_error`);
  }
}
