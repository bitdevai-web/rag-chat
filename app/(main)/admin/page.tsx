"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, Plus, Trash2, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Search, Eye, EyeOff, X
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

type User = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "member";
  avatar_url: string | null;
  oauth_provider: string | null;
  created_at: string;
};

type AuditRow = {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: string;
  created_at: string;
  user_id: number | null;
  username: string | null;
  avatar_url: string | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

function actionColor(action: string) {
  if (action.includes("delete") || action.includes("fail")) return "text-red-500 bg-red-50 dark:bg-red-950/30";
  if (action.includes("create") || action.includes("register")) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
  if (action.includes("login") || action.includes("oauth")) return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
  return "text-gray-600 bg-gray-100 dark:bg-slate-800 dark:text-slate-300";
}

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "audit">("users");
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_LIMIT = 20;

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "member" });
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setMe).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/audit-log?limit=${AUDIT_LIMIT}&offset=${auditOffset}`);
    if (res.ok) {
      const data = await res.json();
      setAuditRows(data.rows);
      setAuditTotal(data.total);
    }
    setLoading(false);
  }, [auditOffset]);

  useEffect(() => { if (tab === "users") loadUsers(); else loadAudit(); }, [tab, loadUsers, loadAudit]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed"); }
    else { setShowForm(false); setForm({ username: "", email: "", password: "", role: "member" }); loadUsers(); }
    setFormLoading(false);
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "member" : "admin";
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    loadUsers();
  };

  const filteredUsers = users.filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (me && me.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Panel</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage users, roles and review audit logs</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-6 w-fit">
        {([["users", Users, "Users"], ["audit", Shield, "Audit Log"]] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="text-sm outline-none bg-transparent text-gray-700 dark:text-slate-200 placeholder-gray-400 w-40"
                />
                {search && <button onClick={() => setSearch("")}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
              </div>
              <span className="text-xs text-gray-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 dark:bg-cyan-600 hover:bg-gray-700 dark:hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={13} /> Add User
            </button>
          </div>

          {/* Add User Form */}
          {showForm && (
            <form onSubmit={createUser} className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="johndoe"
                    required
                    className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 w-32"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                    className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 w-48"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Password</label>
                  <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-cyan-400 bg-white dark:bg-slate-900 w-36">
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="flex-1 text-sm outline-none bg-transparent text-gray-700 dark:text-slate-200 w-24"
                    />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="text-gray-400 hover:text-gray-600 ml-1">
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    {formLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(""); }}
                    className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {formError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500 mt-2">
                  <AlertCircle size={12} />{formError}
                </p>
              )}
            </form>
          )}

          {/* User list */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                  <UserAvatar username={u.username} avatar_url={u.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{u.username}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.oauth_provider && (
                      <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                        {u.oauth_provider}
                      </span>
                    )}
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me?.id}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:cursor-default ${
                        u.role === "admin"
                          ? "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                      }`}
                      title={u.id === me?.id ? "Your own role" : `Click to make ${u.role === "admin" ? "member" : "admin"}`}
                    >
                      {u.role === "admin" ? "Admin" : "Member"}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      disabled={u.id === me?.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {tab === "audit" && (
        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {auditTotal} event{auditTotal !== 1 ? "s" : ""}
            </span>
            <button
              onClick={loadAudit}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {auditRows.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <UserAvatar username={r.username ?? "system"} avatar_url={r.avatar_url} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{r.username ?? "system"}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${actionColor(r.action)}`}>{r.action}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{r.resource_type}{r.resource_id ? ` #${r.resource_id}` : ""}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                ))}
                {auditRows.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-12">No audit events yet</p>
                )}
              </div>

              {/* Pagination */}
              {auditTotal > AUDIT_LIMIT && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-xs text-gray-400">
                    {auditOffset + 1}–{Math.min(auditOffset + AUDIT_LIMIT, auditTotal)} of {auditTotal}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={auditOffset === 0}
                      onClick={() => setAuditOffset((o) => Math.max(0, o - AUDIT_LIMIT))}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      disabled={auditOffset + AUDIT_LIMIT >= auditTotal}
                      onClick={() => setAuditOffset((o) => o + AUDIT_LIMIT)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
