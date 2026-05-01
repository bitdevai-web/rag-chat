"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trash2, Upload, MessageSquare, FileText, Loader2,
  CheckCircle, AlertCircle, RefreshCw, Send, Zap, X, Plus, MessagesSquare, Eye,
  UserPlus, UserMinus, Shield, BookMarked, ChevronDown, ChevronUp, XCircle, Info
} from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { UserAvatar } from "@/components/UserAvatar";

// ── Types ────────────────────────────────────────────────────────────────────
type KB = { id: number; name: string; description: string; summary: string | null; created_at: string; doc_count: number };
type DocStatus = "ready" | "processing" | "error";
type Doc = { id: number; filename: string; file_type: string; size_bytes: number; status: DocStatus; created_at: string; is_baseline: number };
type RiskLevel = "low" | "medium" | "high" | "critical";
type FindingType = "modified" | "missing" | "added" | "risky";
type Finding = { id: number; type: FindingType; severity: RiskLevel; clause: string; baseline: string | null; incoming: string | null; risk: string; recommendation: string };
type ComparisonResult = { summary: string; riskLevel: RiskLevel; stats: { clausesAnalyzed: number; differences: number; missing: number; added: number; risky: number }; findings: Finding[]; acceptableClauses: string[] };
type StoredComparison = { baseline_filename: string; risk_level: string; updated_at: string; result: ComparisonResult } | null;
type Source = { file: string; excerpt: string; score: number };
type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[]; suggestions?: string[]; error?: boolean };
type Conversation = { id: number; title: string; created_at: string; updated_at: string; msg_count: number };
type KBMember = { id: number; username: string; email: string; avatar_url: string | null; role: string };

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

  // Conversations (threads)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  // Document viewer
  const [viewer, setViewer] = useState<{ docId: number; highlight?: string } | null>(null);

  // Contract comparison state
  const [comparisons, setComparisons] = useState<Record<number, StoredComparison>>({});
  const [settingBaseline, setSettingBaseline] = useState<number | null>(null);
  const [expandedComparison, setExpandedComparison] = useState<number | null>(null);

  // KB members / sharing
  const [kbMembers, setKbMembers] = useState<KBMember[]>([]);
  const [shareInput, setShareInput] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);

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

  const loadKbMembers = useCallback(async () => {
    if (!kb) return;
    const res = await fetch(`/api/kb/${kb.id}/members`);
    if (res.ok) setKbMembers(await res.json());
  }, [kb]);

  const loadComparisons = useCallback(async (docList: Doc[]) => {
    const nonBaseline = docList.filter((d) => !d.is_baseline && d.status === "ready");
    const results = await Promise.all(
      nonBaseline.map(async (d) => {
        try {
          const res = await fetch(`/api/documents/comparison?document_id=${d.id}`);
          if (!res.ok) return [d.id, null];
          const data = await res.json();
          return [d.id, data];
        } catch { return [d.id, null]; }
      })
    );
    setComparisons(Object.fromEntries(results));
  }, []);

  const setAsBaseline = async (docId: number) => {
    setSettingBaseline(docId);
    try {
      const res = await fetch("/api/documents/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Failed to set baseline"); return; }
      await loadDocs();
    } catch (e) { alert(String(e)); }
    finally { setSettingBaseline(null); }
  };

  useEffect(() => { loadKb(); }, [loadKb]);
  useEffect(() => {
    if (kb) {
      loadDocs().then(() => {});
      loadKbMembers();
    }
  }, [kb, loadDocs, loadKbMembers]);

  const shareKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kb) return;
    setShareError("");
    setSharing(true);
    const res = await fetch(`/api/kb/${kb.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username_or_email: shareInput, role: shareRole }),
    });
    const data = await res.json();
    if (!res.ok) setShareError(data.error ?? "Failed");
    else { setShareInput(""); loadKbMembers(); }
    setSharing(false);
  };

  const removeKbMember = async (userId: number) => {
    if (!kb) return;
    await fetch(`/api/kb/${kb.id}/members?user_id=${userId}`, { method: "DELETE" });
    loadKbMembers();
  };

  // Reload comparisons when docs list changes
  useEffect(() => { if (docs.length > 0) loadComparisons(docs); }, [docs, loadComparisons]);

  // Poll processing docs
  useEffect(() => {
    if (pollingIds.size === 0) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(loadDocs, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollingIds.size, loadDocs]);

  // Load conversation list for this KB
  const loadConversations = useCallback(async () => {
    if (!kb) return;
    try {
      const res = await fetch(`/api/conversations?category=${encodeURIComponent(kb.name)}`);
      const data: Conversation[] = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        // Auto-select the most recent if none selected
        if (!activeConvId && data.length > 0) setActiveConvId(data[0].id);
      }
    } catch {}
  }, [kb, activeConvId]);

  useEffect(() => { if (kb && tab === "chat") loadConversations(); }, [kb, tab, loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) { setMessages([]); setMsgCount(0); return; }
    fetch(`/api/conversations/${activeConvId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.messages) return;
        const msgs: Message[] = data.messages.map((r: { id: number; role: string; content: string; sources: string; suggestions?: string }) => ({
          id: String(r.id),
          role: r.role as "user" | "assistant",
          content: r.content,
          sources: r.sources ? JSON.parse(r.sources) : [],
          suggestions: r.suggestions ? JSON.parse(r.suggestions) : undefined,
        }));
        setMessages(msgs);
        setMsgCount(msgs.length);
      })
      .catch(() => {});
  }, [activeConvId]);

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
        body: JSON.stringify({ question: q, category: kb.name, conversation_id: activeConvId }),
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
            if (p.conversation_id && !activeConvId) setActiveConvId(p.conversation_id);
            if (p.text) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + p.text } : msg));
            if (p.sources) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, sources: p.sources } : msg));
            if (p.suggestions) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, suggestions: p.suggestions } : msg));
            if (p.error) setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: p.error, error: true } : msg));
          } catch {}
        }
      }
    } catch (e) {
      setMessages((m) => m.map((msg) => msg.id === assistantId
        ? { ...msg, content: "Network error. Is the server running?", error: true } : msg));
    } finally {
      setChatLoading(false);
      loadConversations();
    }
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setMsgCount(0);
  };

  const deleteConversation = async (convId: number) => {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    if (activeConvId === convId) newConversation();
    loadConversations();
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
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Documents ({docs.length})</h2>
                    {docs.some((d) => d.is_baseline) && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <BookMarked size={10} className="text-blue-500" />
                        Baseline set — new uploads will be auto-compared
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {pollingIds.size > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <RefreshCw size={11} className="animate-spin" /> Processing…
                      </span>
                    )}
                    {docs.length < MAX_DOCS && (
                      <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
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
                    {/* Baseline hint if none set */}
                    {!docs.some((d) => d.is_baseline) && docs.some((d) => d.status === "ready") && (
                      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-3">
                        <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                          <span className="font-semibold">Tip:</span> Click <span className="font-semibold">Set as Baseline</span> on your standard T&C document. Every new upload will then be automatically compared against it.
                        </p>
                      </div>
                    )}

                    {docs.map((doc) => {
                      const cmp = comparisons[doc.id];
                      const isExpanded = expandedComparison === doc.id;
                      const riskColors: Record<string, string> = {
                        critical: "bg-red-100 text-red-700 border-red-200",
                        high:     "bg-orange-100 text-orange-700 border-orange-200",
                        medium:   "bg-amber-100 text-amber-700 border-amber-200",
                        low:      "bg-emerald-100 text-emerald-700 border-emerald-200",
                      };
                      const riskBorder: Record<string, string> = {
                        critical: "border-l-4 border-l-red-400",
                        high:     "border-l-4 border-l-orange-400",
                        medium:   "border-l-4 border-l-amber-400",
                        low:      "border-l-4 border-l-emerald-400",
                      };

                      return (
                        <div key={doc.id} className={`rounded-xl border border-gray-100 overflow-hidden ${cmp ? riskBorder[cmp.risk_level] ?? "" : ""}`}>
                          {/* Row */}
                          <div className="flex items-center gap-3 px-3 py-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.is_baseline ? "bg-blue-100" : "bg-gray-50"}`}>
                              {doc.is_baseline
                                ? <BookMarked size={14} className="text-blue-600" />
                                : <FileText size={14} className="text-gray-400" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                                {doc.is_baseline && (
                                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Baseline</span>
                                )}
                                {cmp && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${riskColors[cmp.risk_level]}`}>
                                    {cmp.risk_level} risk
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{formatBytes(doc.size_bytes)} · {timeAgo(doc.created_at)}</p>
                            </div>
                            <StatusBadge status={doc.status} />

                            {/* Set as baseline */}
                            {doc.status === "ready" && !doc.is_baseline && (
                              <button
                                onClick={() => setAsBaseline(doc.id)}
                                disabled={settingBaseline === doc.id}
                                title="Set as baseline for comparison"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                              >
                                {settingBaseline === doc.id ? <Loader2 size={10} className="animate-spin" /> : <BookMarked size={10} />}
                                Baseline
                              </button>
                            )}

                            {/* Expand comparison */}
                            {cmp && (
                              <button
                                onClick={() => setExpandedComparison(isExpanded ? null : doc.id)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                              >
                                <Shield size={10} />
                                Report
                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                            )}

                            <button onClick={() => setViewer({ docId: doc.id })} disabled={doc.status !== "ready"} title="View"
                              className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => deleteDoc(doc.id)} disabled={doc.status === "processing"}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Inline comparison panel */}
                          {isExpanded && cmp && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                              {/* Summary */}
                              <div className={`rounded-xl border p-3 flex items-start gap-3 ${
                                cmp.risk_level === "critical" ? "bg-red-50 border-red-200" :
                                cmp.risk_level === "high"     ? "bg-orange-50 border-orange-200" :
                                cmp.risk_level === "medium"   ? "bg-amber-50 border-amber-200" :
                                "bg-emerald-50 border-emerald-200"
                              }`}>
                                <Shield size={16} className={
                                  cmp.risk_level === "critical" ? "text-red-500 mt-0.5" :
                                  cmp.risk_level === "high"     ? "text-orange-500 mt-0.5" :
                                  cmp.risk_level === "medium"   ? "text-amber-500 mt-0.5" :
                                  "text-emerald-500 mt-0.5"
                                } />
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 mb-0.5">vs {cmp.baseline_filename}</p>
                                  <p className="text-xs text-gray-600 leading-relaxed">{cmp.result.summary}</p>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="grid grid-cols-5 gap-2">
                                {[
                                  { label: "Clauses", value: cmp.result.stats.clausesAnalyzed, c: "text-blue-600" },
                                  { label: "Changed", value: cmp.result.stats.differences,     c: "text-amber-600" },
                                  { label: "Missing", value: cmp.result.stats.missing,         c: "text-red-600" },
                                  { label: "Added",   value: cmp.result.stats.added,           c: "text-indigo-600" },
                                  { label: "Risky",   value: cmp.result.stats.risky,           c: "text-orange-600" },
                                ].map((s) => (
                                  <div key={s.label} className="bg-white rounded-lg p-2 text-center border border-gray-100">
                                    <p className={`text-base font-bold ${s.c}`}>{s.value}</p>
                                    <p className="text-[10px] text-gray-400">{s.label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Findings */}
                              <div className="space-y-2">
                                {cmp.result.findings
                                  .sort((a, b) => {
                                    const o = ["critical","high","medium","low"];
                                    return o.indexOf(a.severity) - o.indexOf(b.severity);
                                  })
                                  .map((f) => {
                                    const sevBg: Record<string, string> = {
                                      critical: "bg-red-50 border-red-200",
                                      high:     "bg-orange-50 border-orange-200",
                                      medium:   "bg-amber-50 border-amber-200",
                                      low:      "bg-blue-50 border-blue-200",
                                    };
                                    const sevText: Record<string, string> = {
                                      critical: "text-red-700",
                                      high:     "text-orange-700",
                                      medium:   "text-amber-700",
                                      low:      "text-blue-700",
                                    };
                                    const TypeIcon = f.type === "missing" ? XCircle : f.type === "added" ? Info : AlertCircle;
                                    return (
                                      <div key={f.id} className={`rounded-lg border px-3 py-2.5 ${sevBg[f.severity]}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <TypeIcon size={12} className={sevText[f.severity]} />
                                          <span className="text-xs font-semibold text-gray-800">{f.clause}</span>
                                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ml-auto ${sevBg[f.severity]} ${sevText[f.severity]} border`}>{f.severity}</span>
                                          <span className="text-[10px] text-gray-500 capitalize">{f.type}</span>
                                        </div>
                                        {f.baseline && <p className="text-[11px] text-gray-500 mb-1"><span className="font-medium text-gray-600">Baseline:</span> {f.baseline}</p>}
                                        {f.incoming && <p className="text-[11px] text-gray-500 mb-1"><span className="font-medium text-gray-600">Incoming:</span> {f.incoming}</p>}
                                        {!f.incoming && <p className="text-[11px] text-red-600 mb-1 font-medium">✗ Absent from this contract</p>}
                                        <p className="text-[11px] text-gray-600 mb-1">{f.risk}</p>
                                        <p className={`text-[11px] font-semibold px-2 py-1 rounded ${
                                          f.recommendation.toLowerCase().startsWith("accept") ? "bg-emerald-100 text-emerald-800" :
                                          f.recommendation.toLowerCase().startsWith("reject") ? "bg-red-100 text-red-800" :
                                          "bg-amber-100 text-amber-800"
                                        }`}>💡 {f.recommendation}</p>
                                      </div>
                                    );
                                  })}
                              </div>

                              {/* Acceptable */}
                              {cmp.result.acceptableClauses.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Matching Clauses</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {cmp.result.acceptableClauses.map((c) => (
                                      <span key={c} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">✓ {c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-[10px] text-gray-400 text-right">Compared {new Date(cmp.updated_at + "Z").toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "480px" }}>
              {/* Threads sidebar */}
              <div className="w-56 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <MessagesSquare size={12} /> Conversations
                  </span>
                  <button
                    onClick={newConversation}
                    title="New conversation"
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-cyan-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {conversations.length === 0 && (
                    <p className="text-xs text-gray-400 px-4 py-3 text-center">
                      No conversations yet.<br />Ask a question to start.
                    </p>
                  )}
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`group flex items-start gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                        activeConvId === c.id
                          ? "bg-cyan-50 text-cyan-700"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <MessageSquare size={11} className="mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {c.msg_count} msg · {timeAgo(c.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 flex flex-col">
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {activeConvId ? conversations.find((c) => c.id === activeConvId)?.title ?? "Chat Session" : "New conversation"}
                  </h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {msgCount} message{msgCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={newConversation}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus size={11} /> New
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
                          {msg.sources.map((s, i) => {
                            const matchedDoc = docs.find((d) => d.filename === s.file);
                            return (
                              <div
                                key={i}
                                onClick={() => matchedDoc && setViewer({ docId: matchedDoc.id, highlight: s.excerpt })}
                                className={`flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 ${matchedDoc ? "cursor-pointer hover:bg-blue-100 transition-colors" : ""}`}
                                title={matchedDoc ? "Click to view in document" : undefined}
                              >
                                <FileText size={11} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-blue-700">
                                    {s.file} <span className="text-blue-400 font-normal">{s.score}% match</span>
                                    {matchedDoc && <span className="ml-1 text-blue-400 font-normal">· view ↗</span>}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.excerpt}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 w-full pt-1">
                          <span className="text-xs text-gray-400 w-full mb-0.5">Try asking:</span>
                          {msg.suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => { setInput(s); }}
                              className="text-xs text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-full px-3 py-1.5 transition-colors text-left"
                            >
                              {s}
                            </button>
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

          {/* Share / Members */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserPlus size={13} /> Share
            </h3>

            {/* Member list */}
            {kbMembers.length > 0 && (
              <div className="space-y-2 mb-3">
                {kbMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <UserAvatar username={m.username} avatar_url={m.avatar_url} size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{m.username}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{m.role}</p>
                    </div>
                    <button
                      onClick={() => removeKbMember(m.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <UserMinus size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Invite form */}
            <form onSubmit={shareKb} className="space-y-2">
              <input
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                placeholder="Username or email"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-400 bg-transparent text-gray-700"
              />
              <div className="flex gap-2">
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white text-gray-700"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {sharing ? <Loader2 size={11} className="animate-spin" /> : "Add"}
                </button>
              </div>
              {shareError && <p className="text-[10px] text-red-500">{shareError}</p>}
            </form>
          </div>
        </div>
      </div>

      {/* Inline document viewer modal */}
      <DocumentViewer
        documentId={viewer?.docId ?? null}
        highlight={viewer?.highlight}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
