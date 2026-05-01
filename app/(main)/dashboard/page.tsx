"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, MessageSquare, Clock, Plus, Search, Database, ArrowRight } from "lucide-react";
import Link from "next/link";

type KB = { id: number; name: string; description: string; doc_count: number; created_at: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months}mo ago`;
  if (days > 0)   return `${days}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  return `${mins}m ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kbs, setKbs]           = useState<KB[]>([]);
  const [username, setUsername] = useState("user");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const [kbRes, meRes] = await Promise.all([fetch("/api/categories"), fetch("/api/auth/me")]);
      const kbData = await kbRes.json();
      const meData = await meRes.json();
      if (Array.isArray(kbData)) setKbs(kbData);
      if (meData.username) setUsername(meData.username);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered    = kbs.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));
  const totalDocs   = kbs.reduce((s, k) => s + k.doc_count, 0);

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, <span className="logo-gradient-text">{username}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your knowledge bases and explore your documents</p>
        </div>
        <button
          onClick={() => router.push("/kb/new")}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-all shadow-sm logo-gradient-bg hover:opacity-90"
        >
          <Plus size={15} /> New Knowledge Base
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Knowledge Bases", value: kbs.length,  icon: Database,      color: "text-cyan-500",   ring: "ring-cyan-100",   bg: "bg-cyan-50"   },
            { label: "Total Documents", value: totalDocs,   icon: FileText,      color: "text-indigo-500", ring: "ring-indigo-100", bg: "bg-indigo-50" },
            { label: "Conversations",   value: "—",         icon: MessageSquare, color: "text-cyan-500",   ring: "ring-cyan-100",   bg: "bg-cyan-50"   },
            { label: "Active Since",    value: kbs.length ? timeAgo(kbs[kbs.length - 1].created_at) : "—", icon: Clock, color: "text-indigo-500", ring: "ring-indigo-100", bg: "bg-indigo-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.ring} ring-1 flex items-center justify-center`}>
                  <s.icon size={15} className={s.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* KB list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Knowledge Bases</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create and manage your document collections</p>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 w-56 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-sm text-slate-700 placeholder-slate-300 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl logo-gradient-bg opacity-10 mx-auto mb-4 flex items-center justify-center">
                <Database size={28} className="text-white" />
              </div>
              <p className="text-sm text-slate-500">
                {search ? "No knowledge bases match your search" : "No knowledge bases yet"}
              </p>
              {!search && (
                <button
                  onClick={() => router.push("/kb/new")}
                  className="mt-4 text-sm font-medium logo-gradient-text hover:opacity-80 transition-opacity"
                >
                  Create your first knowledge base →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((kb, i) => (
                <Link
                  key={kb.id}
                  href={`/kb/${kb.id}`}
                  className="group block bg-white rounded-2xl border border-slate-200 p-5 hover:border-cyan-300 hover:shadow-md transition-all"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  {/* Top accent bar */}
                  <div className="h-1 w-10 rounded-full mb-4 logo-gradient-bg opacity-70 group-hover:opacity-100 group-hover:w-full transition-all duration-300" />

                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl logo-gradient-bg flex items-center justify-center shadow-sm flex-shrink-0">
                      <Database size={15} className="text-white" />
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>

                  <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">{kb.name}</h3>
                  {kb.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{kb.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <FileText size={11} />
                      {kb.doc_count} doc{kb.doc_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(kb.created_at)}</span>
                  </div>
                </Link>
              ))}

              {/* New KB card */}
              <button
                onClick={() => router.push("/kb/new")}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all text-slate-400 hover:text-cyan-600 min-h-[140px]"
              >
                <Plus size={20} />
                <span className="text-xs font-medium">New Knowledge Base</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
