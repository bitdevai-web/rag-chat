import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/teams — teams the current user belongs to
export async function GET(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const teams = db.prepare(`
    SELECT t.id, t.name, t.slug, t.description, t.created_at,
           tm.role AS my_role,
           (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(caller.id);

  return NextResponse.json(teams);
}

// POST /api/teams — create a team
export async function POST(req: NextRequest) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description = "" } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Team name required" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const db = getDb();

  // Ensure slug uniqueness
  const existing = db.prepare("SELECT id FROM teams WHERE slug = ?").get(slug);
  if (existing) return NextResponse.json({ error: "Team slug already exists" }, { status: 409 });

  const result = db
    .prepare("INSERT INTO teams (name, slug, description, created_by) VALUES (?, ?, ?, ?)")
    .run(name.trim(), slug, description, caller.id);
  const teamId = Number(result.lastInsertRowid);

  // Creator becomes owner
  db.prepare("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'owner')").run(teamId, caller.id);
  auditLog(caller.id, "team_created", "team", teamId, { name, slug });

  return NextResponse.json({ ok: true, id: teamId, slug }, { status: 201 });
}
