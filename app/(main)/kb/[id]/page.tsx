"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trash2, Upload, MessageSquare, FileText, Loader2,
  CheckCircle, AlertCircle, RefreshCw, Send, Zap, X, Plus
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type KB = { id: number; name: string; description: string; summary: string | null; created_at: string; doc_count: number };
type DocStatus = "ready" | "processing" | "error";
type Doc = { id: number; filename: string; file_type: string; size_bytes: number; status: DocStatus; created_at: string };
type Source = { file: string; excerpt: string; score: number };
type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[]; error?: boolean };

const MAX_DOCS = 5;
const ACCEPTED = ".pdf,.docx,.txt,.md,.pptx,.xlsx,.csv";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "today";
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === "ready") return (
    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
      <CheckCircle size={11} /> Processed
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
      <Loader2 size={11} className="animate-spin" /> Processing
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
      <AlertCircle size={11} /> Error
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function KBDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [kb, setKb] = useState<KB | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState<"overview" | "chat">("overview");
  const [loadingKb, setLoadingKb] = useState(true);

  // Overview state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [pollingIds, setPollingIds] = useState<Set<number>>(new Set());
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load KB + docs ────────────────────────────────────────────────────────
  const loadKb = useCallback(async () => {
    try {
      const res = await fetch(`/api/categories/${id}`);
      const data = await res.json();
      if (res.ok) setKb(data);
      else router.push("/dashboard");
    } catch { router.push("/dashboard"); }
    setLoadingKb(false);
  }, [id, router]);

  const loadDocs = useCallback(async () => {
    if (!kb) return;
    try {
      const res = await fetch(`/api/documents?category=${encodeURIComponent(kb.name)}`);
      const data: Doc[] = await res.json();
      if (Array.isArray(data)) {
        setDocs(data);
        const processing = new Set(data.filter((d) => d.status === "processing").map((d) => d.id));
        setPollingIds(processing);
      }
    } catch {}
  }, [kb]);

  useEffect(() => { loadKb(); }, [loadKb]);
  useEffect(() => { if (kb) loadDocs(); }, [kb, loadDocs]);

  // Poll processing docs
  useEffect(() => {
    if (pollingIds.size === 0) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(loadDocs, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollingIds.size, loadDocs]);

  // Load chat history
  useEffect(() => {
    if (!kb || tab !== "chat") return;
    fetch(`/api/chat?category=${encodeURIComponent(kb.name)}`)
      .then((r) => r.json())
      .then((rows: { id: number; role: string; content: string; sources: string }[]) => {
        if (!Array.isArray(rows)) return;
        const msgs = rows.map((r) => ({
          id: String(r.id), role: r.role as "user" | "assistant",
          content: r.content, sources: r.sources ? JSON.parse(r.sources) : [],
        }));
        setMessages(msgs);
        setMsgCount(msgs.length);
      })
      .catch(() => {});
  }, [kb, tab]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!kb) return;
    setUploadError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("category", kb.name);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setUploadError(data.error ?? "Upload failed");
      else { await loadDocs(); await loadKb(); }
    } catch (e) { setUploadError(String(e)); }
    finally { setUploading(false); }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, MAX_DOCS - docs.length).forEach((f) => uploadFile(f));
  };

  const deleteDoc = async (docId: number) => {
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== docId));
    loadKb();
  };

  const deleteKb = async () => {
    if (!confirm(`Delete "${kb?.name}" and all its documents?`)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const generateSummary = async () => {
    if (!kb) return;
    setGeneratingSummary(true);
    setSummaryError("");
    try {
      const res = await fetch(`/api/categories/${id}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setSummaryError(data.error ?? "Failed to generate summary");
      else setKb((k) => k ? { ...k, summary: data.summary } : k);
    } catch (e) { setSummaryError(String(e)); }
    finally { setGeneratingSummary(false); }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const send = async () => {
    if (!kb || !input.trim() || chatLoading) return;
    const q = input.trim();
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    setMessages((m) => [...m, userMsg]);
    setChatLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, category: kb.name }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/event-stream")) {
        const data = await res.json();
        setMessages((m) => m.map((msg) => msg.id === assistantId
          ? { ...msg, content: data.answer || data.error || "Error", error: !!data.error } : msg));
        setChatLoading(false);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") { setMsgCount((c) => c + 2); continue; }
          try {
            const p = JSON.parse(raw);
            if (p.text) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + p.text } : msg));
            if (p.sources) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, sources: p.sources } : msg));
            if (p.error) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: p.error, error: true } : msg));
          } catch {}
        }
      }
    } catch (e) {
      setMessages((m) => m.map((msg) => msg.id === assistantId
        ? { ...msg, content: "Network error. Is the server running?", error: true } : msg));
    } finally { setChatLoading(false); }
  };

  const clearChat = async () => {
    if (!kb) return;
    setMessages([]);
    setMsgCount(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingKb) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );
  if (!kb) return null;

  const readyDocs = docs.filter((d) => d.status === "ready").length;

  return (
    <div>
      {/* Back */}
      <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{kb.name}</h1>
          {kb.description && <p className="text-sm text-gray-500 mt-1">{kb.description}</p>}
        </div>
        <button
          onClick={deleteKb}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab("overview")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "overview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText size={14} /> Overview
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "chat" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare size={14} /> Chat
            </button>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
                {uploadError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {uploadError}
                    <button onClick={() => setUploadError("")} className="ml-auto"><X size={13} /></button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => !uploading && docs.length < MAX_DOCS && fileRef.current?.click()}
                    disabled={uploading || docs.length >= MAX_DOCS}
                    className="flex flex-col items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-5 transition-colors"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    <span className="text-sm font-medium">{uploading ? "Uploading…" : "Upload Document"}</span>
                    <span className="text-xs text-gray-400">Add new files to knowledge base</span>
                  </button>
                  <button
                    onClick={() => setTab("chat")}
                    className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl py-5 transition-colors"
                  >
                    <MessageSquare size={18} />
                    <span className="text-sm font-medium">Start Chat</span>
                    <span className="text-xs text-gray-400">Ask questions about your docs</span>
                  </button>
                </div>
                <input ref={fileRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
                  <button
                    onClick={generateSummary}
                    disabled={generatingSummary || readyDocs === 0}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {generatingSummary ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Generate
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 pb-3 border-b border-gray-100 mb-4">
                  <span>Total Documents:</span>
                  <span className="font-semibold text-gray-900">{docs.length}</span>
                </div>

                {summaryError && (
                  <p className="text-xs text-red-500 mb-3">{summaryError}</p>
                )}

                {kb.summary ? (
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    <p className="text-xs text-gray-400 mb-2 font-medium">AI Summary:</p>
                    {kb.summary}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Zap size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">
                      {readyDocs === 0
                        ? "Upload and process documents to generate a summary"
                        : 'Click "Generate" to create an AI summary of your documents'}
                    </p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Documents ({docs.length})</h2>
                  <div className="flex items-center gap-3">
                    {pollingIds.size > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <RefreshCw size={11} className="animate-spin" /> Processing…
                      </span>
                    )}
                    {docs.length < MAX_DOCS && (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>

                {docs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No documents yet — upload your first one</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={15} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                          <p className="text-xs text-gray-400">
                            {formatBytes(doc.size_bytes)} · {timeAgo(doc.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={doc.status} />
                        <button
                          onClick={() => deleteDoc(doc.id)}
                          disabled={doc.status === "processing"}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "480px" }}>
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Chat Session</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {msgCount} message{msgCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Trash2 size={11} /> Clear
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={28} className="text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Start a conversation</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Ask anything about your documents — e.g. &ldquo;What are the key points?&rdquo;
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-violet-600"
                        : "bg-gray-100"
                    }`}>
                      {msg.role === "user" ? (
                        <span className="text-white text-xs font-bold">U</span>
                      ) : (
                        <span className="text-gray-500 text-xs font-bold">AI</span>
                      )}
                    </div>

                    <div className={`max-w-[75%] space-y-2 ${msg.role === "user" ? "items-end flex flex-col" : ""}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.error ? "bg-red-50 border border-red-200 text-red-700"
                        : msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
                      }`}>
                        {msg.content || <span className="flex items-center gap-2 text-gray-400"><Loader2 size={12} className="animate-spin" />Thinking…</span>}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-1 w-full">
                          {msg.sources.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                              <FileText size={11} className="text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-700">
                                  {s.file} <span className="text-blue-400 font-normal">{s.score}% match</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.excerpt}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Ask a question about your documents..."
                    disabled={chatLoading}
                    className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || chatLoading}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    {chatLoading ? <Loader2 size={13} className="text-white animate-spin" /> : <Send size={13} className="text-white" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info panel */}
        <div className="w-56 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Created</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">{timeAgo(kb.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Documents</p>
                <p className="text-xs font-medium text-blue-600 mt-0.5">{docs.length} file{docs.length !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-xs font-medium text-emerald-600 mt-0.5">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
