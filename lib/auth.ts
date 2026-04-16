import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

const SESSION_COOKIE = "rag_session";
const SECRET = process.env.SESSION_SECRET ?? "rag-chat-secret-2024";
const SESSION_HOURS = 7 * 24; // 7 days

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "member";
  avatar_url: string | null;
};

// ── HMAC helpers ─────────────────────────────────────────────────────────────

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(userId: number): string {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = `${userId}:${expires}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifySessionToken(token: string): { userId: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    if (sign(payload) !== sig) return null;
    const [userId, expires] = payload.split(":");
    if (Date.now() > Number(expires)) return null;
    return { userId: Number(userId) };
  } catch {
    return null;
  }
}

// ── Session user resolution ───────────────────────────────────────────────────

export function getSessionUser(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, email, role, avatar_url FROM users WHERE id = ?")
    .get(verified.userId) as SessionUser | undefined;
  return row ?? null;
}

// ── Password helpers ──────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Audit log helper ──────────────────────────────────────────────────────────

export function auditLog(
  userId: number | null,
  action: string,
  resourceType: string,
  resourceId: number | string | null = null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, action, resourceType, resourceId ? String(resourceId) : null, JSON.stringify(metadata));
  } catch {
    // non-fatal
  }
}

export { SESSION_COOKIE };
