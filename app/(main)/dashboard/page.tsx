"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, MessageSquare, Clock, Plus, Search, Database } from "lucide-react";
import Link from "next/link";

type KB = {
  id: number;
  name: string;
  description: string;
  doc_count: number;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${mins} min ago`;
}

function monthsAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "< 1 Month";
  return `${months} Month${months > 1 ? "s" : ""}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kbs, setKbs] = useState<KB[]>([]);
  const [username, setUsername] = useState("user");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [kbRes, meRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/auth/me"),
      ]);
      const kbData = await kbRes.json();
      const meData = await meRes.json();
      if (Array.isArray(kbData)) setKbs(kbData);
      if (meData.username) setUsername(meData.username);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = kbs.filter((k) =>
    k.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDocs = kbs.reduce((s, k) => s + k.doc_count, 0);
  const oldestKb = kbs.length ? kbs[kbs.length - 1] : null;

  const stats = [
    { label: "Knowledge Bases", value: kbs.length, sub: "Active knowledge bases", icon: Database },
    { label: "Total Documents", value: totalDocs, sub: "Documents processed", icon: FileText },
    { label: "Knowledge Bases", value: kbs.length, sub: "Total knowledge bases", icon: MessageSquare },
    {
      label: "Account Age",
      value: oldestKb ? monthsAgo(oldestKb.created_at) : "—",
      sub: "Member since",
      icon: Clock,
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {username}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your knowledge bases and explore your documents
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <s.icon size={16} className="text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* KB list */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Knowledge Bases</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create and manage your document collections</p>
          </div>
          <button
            onClick={() => router.push("/kb/new")}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={14} /> Create Knowledge Base
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 mb-5 focus-within:border-blue-300 transition-colors">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge bases..."
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {search ? "No knowledge bases match your search" : "No knowledge bases yet"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/kb/new")}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Create your first knowledge base →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((kb) => (
              <Link
                key={kb.id}
                href={`/kb/${kb.id}`}
                className="block border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                  {kb.name}
                </h3>
                {kb.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{kb.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <FileText size={12} />
                    {kb.doc_count} doc{kb.doc_count !== 1 ? "s" : ""}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    active
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Created {timeAgo(kb.created_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
