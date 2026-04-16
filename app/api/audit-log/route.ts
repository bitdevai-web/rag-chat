import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/audit-log?limit=50&offset=0&resource_type=X
export async function GET(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const limit  = Math.min(Number(searchParams.get("limit")  ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const resourceType = searchParams.get("resource_type");
  const userId = searchParams.get("user_id");

  const db = getDb();
  const conditions: string[] = [];
  const vals: (string | number)[] = [];

  if (resourceType) { conditions.push("al.resource_type = ?"); vals.push(resourceType); }
  if (userId)       { conditions.push("al.user_id = ?");       vals.push(Number(userId)); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db.prepare(`
    SELECT al.id, al.action, al.resource_type, al.resource_id, al.metadata, al.created_at,
           u.id AS user_id, u.username, u.avatar_url
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    ${where}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...vals, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as n FROM audit_log al ${where}`).get(...vals) as { n: number }).n;

  return NextResponse.json({ rows, total, limit, offset });
}
