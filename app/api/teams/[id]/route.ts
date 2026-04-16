import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

function getTeamMembership(db: ReturnType<typeof import("@/lib/db").getDb>, teamId: number, userId: number) {
  return db.prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?").get(teamId, userId) as
    | { role: string }
    | undefined;
}

// GET /api/teams/[id] — team detail + members
export async function GET(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = Number(params.id);
  const db = getDb();
  const membership = getTeamMembership(db, teamId, caller.id);
  if (!membership && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_url, tm.role, tm.joined_at
    FROM team_members tm JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ? ORDER BY tm.joined_at ASC
  `).all(teamId);

  return NextResponse.json({ ...team as object, members });
}

// PATCH /api/teams/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = Number(params.id);
  const db = getDb();
  const membership = getTeamMembership(db, teamId, caller.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Owner/admin required" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (name) db.prepare("UPDATE teams SET name = ? WHERE id = ?").run(name, teamId);
  if (description !== undefined) db.prepare("UPDATE teams SET description = ? WHERE id = ?").run(description, teamId);
  auditLog(caller.id, "team_updated", "team", teamId);

  return NextResponse.json({ ok: true });
}

// DELETE /api/teams/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = Number(params.id);
  const db = getDb();
  const membership = getTeamMembership(db, teamId, caller.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Owner required" }, { status: 403 });
  }

  db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  auditLog(caller.id, "team_deleted", "team", teamId);
  return NextResponse.json({ ok: true });
}
