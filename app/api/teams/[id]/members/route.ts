import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, auditLog } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

// POST /api/teams/[id]/members — add/invite a member
export async function POST(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = Number(params.id);
  const db = getDb();

  const callerRole = (db.prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?").get(teamId, caller.id) as { role: string } | undefined)?.role;
  if (!callerRole || (callerRole !== "owner" && callerRole !== "admin")) {
    return NextResponse.json({ error: "Owner/admin required" }, { status: 403 });
  }

  const { username_or_email, role = "member" } = await req.json();
  if (!username_or_email) return NextResponse.json({ error: "username_or_email required" }, { status: 400 });

  const user = db
    .prepare("SELECT id, username FROM users WHERE username = ? OR email = ?")
    .get(username_or_email, username_or_email) as { id: number; username: string } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const alreadyMember = db.prepare("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?").get(teamId, user.id);
  if (alreadyMember) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  db.prepare("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)").run(teamId, user.id, role);
  auditLog(caller.id, "team_member_added", "team", teamId, { user_id: user.id, role });

  return NextResponse.json({ ok: true });
}

// DELETE /api/teams/[id]/members?user_id=X — remove a member
export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = getSessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = Number(params.id);
  const userId = Number(req.nextUrl.searchParams.get("user_id"));
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const db = getDb();
  const callerRole = (db.prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?").get(teamId, caller.id) as { role: string } | undefined)?.role;

  // Members can remove themselves; owner/admin can remove others
  if (caller.id !== userId && (!callerRole || (callerRole !== "owner" && callerRole !== "admin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  db.prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?").run(teamId, userId);
  auditLog(caller.id, "team_member_removed", "team", teamId, { user_id: userId });

  return NextResponse.json({ ok: true });
}
