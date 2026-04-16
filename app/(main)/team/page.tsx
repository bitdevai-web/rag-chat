"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Loader2, AlertCircle, X, Crown, UserMinus, Settings2
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

type Team = {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  my_role: string;
  member_count: number;
};

type Member = {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
};

type TeamDetail = Team & { members: Member[] };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const days  = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months}mo ago`;
  if (days   > 0) return `${days}d ago`;
  return "today";
}

const roleColors: Record<string, string> = {
  owner: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  admin: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
  member:"bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400",
};

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create team form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteInput, setInviteInput] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/teams");
    if (res.ok) setTeams(await res.json());
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    const res = await fetch(`/api/teams/${id}`);
    if (res.ok) setActiveTeam(await res.json());
    setDetailLoading(false);
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Failed"); }
    else { setShowCreate(false); setNewName(""); setNewDesc(""); loadTeams(); }
    setCreating(false);
  };

  const deleteTeam = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (activeTeam?.id === id) setActiveTeam(null);
    loadTeams();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setInviteError("");
    setInviting(true);
    const res = await fetch(`/api/teams/${activeTeam.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username_or_email: inviteInput, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { setInviteError(data.error ?? "Failed"); }
    else { setInviteInput(""); loadDetail(activeTeam.id); }
    setInviting(false);
  };

  const removeMember = async (userId: number) => {
    if (!activeTeam) return;
    await fetch(`/api/teams/${activeTeam.id}/members?user_id=${userId}`, { method: "DELETE" });
    loadDetail(activeTeam.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Teams</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Create teams and manage members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-gray-900 dark:bg-cyan-600 hover:bg-gray-700 dark:hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={14} /> New Team
        </button>
      </div>

      <div className="flex gap-5">
        {/* Teams list */}
        <div className="w-64 shrink-0 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No teams yet</p>
              <p className="text-xs text-gray-400 mt-1">Create one to collaborate</p>
            </div>
          ) : (
            teams.map((t) => (
              <div
                key={t.id}
                onClick={() => loadDetail(t.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                  activeTeam?.id === t.id
                    ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/40"
                    : "bg-white dark:bg-slate-900/70 border-gray-200 dark:border-slate-800 hover:border-cyan-200 dark:hover:border-slate-700"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {t.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.member_count} member{t.member_count !== 1 ? "s" : ""} · {timeAgo(t.created_at)}</p>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${roleColors[t.my_role] ?? roleColors.member}`}>
                    {t.my_role}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Create Team form */}
          {showCreate && (
            <form onSubmit={createTeam} className="bg-white dark:bg-slate-900/70 rounded-2xl border border-cyan-200 dark:border-cyan-800/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">New Team</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Team name"
                required
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-transparent text-gray-700 dark:text-slate-200"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-transparent text-gray-700 dark:text-slate-200"
              />
              {createError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{createError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="flex-1 flex items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
                  {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Team detail */}
        <div className="flex-1 min-w-0">
          {!activeTeam && !detailLoading ? (
            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-gray-200 dark:border-slate-800 flex items-center justify-center h-64">
              <div className="text-center">
                <Settings2 size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Select a team to manage members</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
          ) : activeTeam && (
            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-gray-200 dark:border-slate-800">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{activeTeam.name}</h2>
                  {activeTeam.description && <p className="text-xs text-gray-400 mt-0.5">{activeTeam.description}</p>}
                </div>
                {(activeTeam.my_role === "owner" || activeTeam.my_role === "admin") && (
                  <button
                    onClick={() => deleteTeam(activeTeam.id)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={11} /> Delete Team
                  </button>
                )}
              </div>

              {/* Invite form */}
              {(activeTeam.my_role === "owner" || activeTeam.my_role === "admin") && (
                <form onSubmit={invite} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
                  <input
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="Username or email"
                    required
                    className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {inviting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Invite
                  </button>
                  {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
                </form>
              )}

              {/* Members list */}
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {activeTeam.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    <UserAvatar username={m.username} avatar_url={m.avatar_url} size={34} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{m.username}</p>
                      <p className="text-xs text-gray-400 truncate">{m.email}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[m.role] ?? roleColors.member}`}>
                      {m.role === "owner" && <Crown size={9} className="inline mr-1" />}
                      {m.role}
                    </span>
                    {(activeTeam.my_role === "owner" || activeTeam.my_role === "admin") && m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
