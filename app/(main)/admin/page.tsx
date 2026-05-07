"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, Plus, Trash2, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Search, Eye, EyeOff, X, Copy,
  Check, KeyRound, Mail, UserCircle2, Shuffle, Send, Pencil,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

/* ─── Types ──────────────────────────────────────────────────────────────── */
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
type Creds = { username: string; email: string; password: string };

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
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
  if (action.includes("delete") || action.includes("fail")) return "text-red-500 bg-red-50";
  if (action.includes("create") || action.includes("register")) return "text-emerald-600 bg-emerald-50";
  if (action.includes("login") || action.includes("oauth")) return "text-blue-600 bg-blue-50";
  return "text-slate-600 bg-slate-100";
}
function generatePassword(len = 12) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* ─── Credential Card Modal ──────────────────────────────────────────────── */
function CredentialCard({ creds, onClose }: { creds: Creds; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    const text = `Login Credentials\n─────────────────\nUsername : ${creds.username}\nEmail    : ${creds.email}\nPassword : ${creds.password}\nLogin URL: ${window.location.origin}/login`;
    copy(text, "all");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="logo-gradient-bg px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Send size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">User Created!</p>
              <p className="text-xs text-white/70">Copy credentials to share with the user</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Creds */}
        <div className="px-6 py-5 space-y-3">
          {[
            { icon: UserCircle2, label: "Username", value: creds.username, key: "username" },
            { icon: Mail,        label: "Email",    value: creds.email,    key: "email"    },
            { icon: KeyRound,    label: "Password", value: creds.password, key: "password" },
          ].map(({ icon: Icon, label, value, key }) => (
            <div key={key} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Icon size={15} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-sm font-mono text-slate-800 truncate">{value}</p>
              </div>
              <button
                onClick={() => copy(value, key)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                title="Copy"
              >
                {copied === key ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} className="text-slate-400" />
                )}
              </button>
            </div>
          ))}

          {/* Login URL */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div className="w-[15px] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium">Login URL</p>
              <p className="text-sm font-mono text-slate-800 truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}/login
              </p>
            </div>
            <button
              onClick={() => copy(`${window.location.origin}/login`, "url")}
              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {copied === "url" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={copyAll}
            className="flex-1 flex items-center justify-center gap-2 logo-gradient-bg text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            {copied === "all" ? <Check size={14} /> : <Copy size={14} />}
            {copied === "all" ? "Copied!" : "Copy All Credentials"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reset Password Modal ───────────────────────────────────────────────── */
function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState(generatePassword());
  const [showPw, setShowPw]     = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <CredentialCard
        creds={{ username: user.username, email: user.email, password }}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-cyan-600" />
            <p className="text-sm font-semibold text-slate-800">Reset Password — {user.username}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">New Password</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-cyan-400 bg-slate-50">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 text-sm font-mono outline-none bg-transparent text-slate-800"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            <Shuffle size={12} /> Generate new password
          </button>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={12} />{error}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={submit}
            disabled={loading || !password}
            className="flex-1 flex items-center justify-center gap-2 logo-gradient-bg text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Reset &amp; Get Credentials
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit User Modal ────────────────────────────────────────────────────── */
function EditUserModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm]     = useState({ username: user.username, email: user.email, role: user.role });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil size={14} className="text-indigo-500" />
            <p className="text-sm font-semibold text-slate-800">Edit User — {user.username}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {[
            { label: "Username", key: "username", type: "text" },
            { label: "Email",    key: "email",    type: "email" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
              <input
                type={type}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 bg-slate-50 text-slate-800"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 bg-slate-50 text-slate-800"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={12} />{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 logo-gradient-bg text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ────────────────────────────────────────────────────── */
export default function AdminPage() {
  const [tab, setTab]     = useState<"users" | "audit">("users");
  const [me, setMe]       = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");

  // Audit
  const [auditRows, setAuditRows]     = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal]   = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_LIMIT = 20;

  // Create user form
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ username: "", email: "", password: generatePassword(), role: "member" });
  const [showPw, setShowPw]           = useState(true);
  const [formError, setFormError]     = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Modals
  const [creds, setCreds]         = useState<Creds | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [editUser, setEditUser]   = useState<User | null>(null);

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
    if (!res.ok) {
      setFormError(data.error ?? "Failed to create user");
      setFormLoading(false);
      return;
    }
    // Show credential card
    setCreds({ username: form.username, email: form.email, password: form.password });
    setShowForm(false);
    setForm({ username: "", email: "", password: generatePassword(), role: "member" });
    loadUsers();
    setFormLoading(false);
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (me && me.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Modals ── */}
      {creds     && <CredentialCard creds={creds} onClose={() => setCreds(null)} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {editUser  && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={loadUsers} />}

      <div>
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create &amp; manage users, share login credentials, review audit logs
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {([
            ["users", Users, "Users"],
            ["audit", Shield, "Audit Log"],
          ] as const).map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} /> {label}
              {key === "users" && users.length > 0 && (
                <span className="ml-1 text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus-within:border-cyan-400 transition-colors">
                  <Search size={13} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users…"
                    className="text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 w-36"
                  />
                  {search && (
                    <button onClick={() => setSearch("")}>
                      <X size={12} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => { setShowForm((v) => !v); setFormError(""); }}
                className="flex items-center gap-1.5 logo-gradient-bg text-white text-xs font-medium px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                {showForm ? <X size={13} /> : <Plus size={13} />}
                {showForm ? "Cancel" : "New User"}
              </button>
            </div>

            {/* ── Create User Form ── */}
            {showForm && (
              <form onSubmit={createUser} className="px-5 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">New User Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Username *</label>
                    <input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="e.g. john_doe"
                      required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 bg-white text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@company.com"
                      required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 bg-white text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Password *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-cyan-400 bg-white gap-2">
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="flex-1 text-sm font-mono outline-none bg-transparent text-slate-700"
                      />
                      <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-400 hover:text-slate-600 shrink-0">
                        {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, password: generatePassword() })}
                      className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 mt-1.5 font-medium"
                    >
                      <Shuffle size={11} /> Generate random password
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 bg-white text-slate-700"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500 mb-3">
                    <AlertCircle size={12} /> {formError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 logo-gradient-bg text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-sm"
                  >
                    {formLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create &amp; Get Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(""); }}
                    className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ── User List ── */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={22} className="animate-spin text-slate-300" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <Users size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {search ? "No users match your search" : "No users yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                    {/* Avatar */}
                    <UserAvatar username={u.username} avatar_url={u.avatar_url} size={38} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{u.username}</p>
                        {u.id === me?.id && (
                          <span className="text-[10px] bg-cyan-50 text-cyan-600 border border-cyan-200 px-1.5 py-0.5 rounded-full font-medium">
                            you
                          </span>
                        )}
                        {u.oauth_provider && (
                          <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-200 px-1.5 py-0.5 rounded-full">
                            {u.oauth_provider}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Joined {timeAgo(u.created_at)}</p>
                    </div>

                    {/* Role badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      u.role === "admin"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {u.role === "admin" ? "Admin" : "Member"}
                    </span>

                    {/* Actions — visible on hover */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={13} />
                      </button>
                      {!u.oauth_provider && (
                        <button
                          onClick={() => setResetUser(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                          title="Reset password &amp; share credentials"
                        >
                          <KeyRound size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={u.id === me?.id}
                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                        title={u.id === me?.id ? "Cannot delete yourself" : "Delete user"}
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-900">
                {auditTotal} event{auditTotal !== 1 ? "s" : ""}
              </span>
              <button
                onClick={loadAudit}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={22} className="animate-spin text-slate-300" />
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {auditRows.map((r) => (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                      <UserAvatar username={r.username ?? "system"} avatar_url={r.avatar_url} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800">{r.username ?? "system"}</span>
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${actionColor(r.action)}`}>
                            {r.action}
                          </span>
                          <span className="text-xs text-slate-400">
                            {r.resource_type}{r.resource_id ? ` #${r.resource_id}` : ""}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(r.created_at)}</span>
                    </div>
                  ))}
                  {auditRows.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-16">No audit events yet</p>
                  )}
                </div>

                {auditTotal > AUDIT_LIMIT && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {auditOffset + 1}–{Math.min(auditOffset + AUDIT_LIMIT, auditTotal)} of {auditTotal}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={auditOffset === 0}
                        onClick={() => setAuditOffset((o) => Math.max(0, o - AUDIT_LIMIT))}
                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        disabled={auditOffset + AUDIT_LIMIT >= auditTotal}
                        onClick={() => setAuditOffset((o) => o + AUDIT_LIMIT)}
                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
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
    </>
  );
}
