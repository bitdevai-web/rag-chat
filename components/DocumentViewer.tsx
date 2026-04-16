"use client";
import { useEffect, useState, useRef } from "react";
import { X, FileText, Loader2, Search } from "lucide-react";

type Doc = {
  id: number;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: string;
  created_at: string;
};

type Chunk = { content: string; chunk_index: number };

type Props = {
  documentId: number | null;   // if null, not open
  highlight?: string | null;   // excerpt to scroll to / highlight
  onClose: () => void;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string | null }) {
  if (!query) return <>{text}</>;
  // Use first ~25 chars of query for a loose phrase highlight
  const needle = query.slice(0, 25).trim();
  if (!needle) return <>{text}</>;
  const re = new RegExp(escapeRegExp(needle), "i");
  const m = text.match(re);
  if (!m) return <>{text}</>;
  const idx = text.indexOf(m[0]);
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 rounded px-0.5">
        {m[0]}
      </mark>
      {text.slice(idx + m[0].length)}
    </>
  );
}

export function DocumentViewer({ documentId, highlight, onClose }: Props) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!documentId) {
      setDoc(null);
      setChunks([]);
      return;
    }
    setLoading(true);
    fetch(`/api/documents/${documentId}/content`)
      .then((r) => r.json())
      .then((data) => {
        if (data.document) setDoc(data.document);
        if (Array.isArray(data.chunks)) setChunks(data.chunks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  // Scroll the first highlighted chunk into view
  useEffect(() => {
    if (!highlight || chunks.length === 0) return;
    const t = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [highlight, chunks]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (documentId) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [documentId, onClose]);

  if (!documentId) return null;

  const activeQuery = search.trim() || highlight || "";
  const displayChunks = search.trim()
    ? chunks.filter((c) => c.content.toLowerCase().includes(search.trim().toLowerCase()))
    : chunks;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-blue-500 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                {doc?.filename ?? "Loading…"}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {chunks.length} section{chunks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-cyan-400 transition-colors">
            <Search size={13} className="text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search within document..."
              className="flex-1 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-300 dark:text-slate-600" />
            </div>
          )}
          {!loading && displayChunks.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-12">
              {search ? "No matches found" : "No content available"}
            </p>
          )}
          {!loading && displayChunks.map((c) => {
            const isHighlight = highlight && c.content.toLowerCase().includes(highlight.slice(0, 25).toLowerCase());
            return (
              <div
                key={c.chunk_index}
                ref={isHighlight ? highlightRef : undefined}
                className={`text-sm leading-relaxed whitespace-pre-wrap rounded-lg p-4 border ${
                  isHighlight
                    ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40 text-gray-800 dark:text-slate-200"
                    : "bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-300"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2 font-medium">
                  Section {c.chunk_index + 1}
                </p>
                <HighlightedText text={c.content} query={activeQuery} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
