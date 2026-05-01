"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, Loader2, X, AlertTriangle, CheckCircle,
  XCircle, AlertCircle, Shield, ChevronDown, ChevronUp, Zap, ArrowRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type DocState =
  | { phase: "uploading" }
  | { phase: "extracting" }
  | { phase: "ready"; points: string[]; text: string }
  | { phase: "error"; message: string };

type Document = { id: string; filename: string; size: number; state: DocState };

type Severity = "low" | "medium" | "high" | "critical";

type Difference = {
  clause: string;
  doc1: string | null;
  doc2: string | null;
  change: "added" | "removed" | "modified" | "risky";
  severity: Severity;
  impact: string;
  recommendation: "Accept" | "Negotiate" | "Reject";
};

type DiffResult = {
  riskLevel: Severity;
  summary: string;
  differences: Difference[];
  matching: string[];
};

type DiffState =
  | { phase: "idle" }
  | { phase: "comparing" }
  | { phase: "done"; result: DiffResult }
  | { phase: "error"; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

const SEV_BG: Record<Severity, string> = {
  critical: "bg-red-50 border-red-200",
  high:     "bg-orange-50 border-orange-200",
  medium:   "bg-amber-50 border-amber-200",
  low:      "bg-blue-50 border-blue-200",
};
const SEV_TEXT: Record<Severity, string> = {
  critical: "text-red-700",
  high:     "text-orange-700",
  medium:   "text-amber-700",
  low:      "text-blue-700",
};
const SEV_BADGE: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high:     "bg-orange-100 text-orange-800 border-orange-300",
  medium:   "bg-amber-100 text-amber-800 border-amber-300",
  low:      "bg-blue-100 text-blue-800 border-blue-300",
};
const CHANGE_ICON: Record<string, React.ElementType> = {
  added:    AlertCircle,
  removed:  XCircle,
  modified: AlertTriangle,
  risky:    AlertTriangle,
};
const REC_STYLE: Record<string, string> = {
  Accept:    "bg-emerald-50 text-emerald-800 border-emerald-200",
  Negotiate: "bg-amber-50 text-amber-800 border-amber-200",
  Reject:    "bg-red-50 text-red-800 border-red-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function DifferenceCard({ diff }: { diff: Difference }) {
  const [open, setOpen] = useState(false);
  const Icon = CHANGE_ICON[diff.change] ?? AlertTriangle;

  return (
    <div className={`rounded-xl border overflow-hidden ${SEV_BG[diff.severity]}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={14} className={SEV_TEXT[diff.severity]} />
        <span className="flex-1 text-sm font-semibold text-gray-800">{diff.clause}</span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${SEV_BADGE[diff.severity]}`}>
          {diff.severity}
        </span>
        <span className="text-[10px] text-gray-500 capitalize bg-white border border-gray-200 px-2 py-0.5 rounded-full">
          {diff.change}
        </span>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-white/60">
          {diff.doc1 && (
            <div className="bg-white/80 rounded-lg p-3 border border-white">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Document 1</p>
              <p className="text-xs text-gray-700 leading-relaxed">{diff.doc1}</p>
            </div>
          )}
          {diff.doc2 && (
            <div className="bg-white/80 rounded-lg p-3 border border-white">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Document 2</p>
              <p className="text-xs text-gray-700 leading-relaxed">{diff.doc2}</p>
            </div>
          )}
          {!diff.doc1 && <p className="text-xs text-red-600 font-medium">✗ Absent in Document 1</p>}
          {!diff.doc2 && <p className="text-xs text-red-600 font-medium">✗ Absent in Document 2</p>}
          <p className="text-xs text-gray-600">{diff.impact}</p>
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-lg border ${REC_STYLE[diff.recommendation]}`}>
            💡 {diff.recommendation}
          </span>
        </div>
      )}
    </div>
  );
}

function DocCard({
  doc, index, onRemove,
}: { doc: Document; index: number; onRemove: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm text-white ${
          index === 0 ? "bg-blue-500" : "bg-violet-500"
        }`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{doc.filename}</p>
          <p className="text-xs text-gray-400">{fmt(doc.size)}</p>
        </div>

        {doc.state.phase === "uploading" && (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            <Loader2 size={10} className="animate-spin" /> Uploading
          </span>
        )}
        {doc.state.phase === "extracting" && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            <Loader2 size={10} className="animate-spin" /> Reading
          </span>
        )}
        {doc.state.phase === "ready" && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle size={10} /> Ready
          </span>
        )}
        {doc.state.phase === "error" && (
          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <AlertCircle size={10} /> Error
          </span>
        )}

        <button
          onClick={onRemove}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {doc.state.phase === "uploading" && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Uploading file…
          </div>
        )}
        {doc.state.phase === "extracting" && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Extracting key terms…
          </div>
        )}
        {doc.state.phase === "error" && (
          <p className="text-xs text-red-500 py-2">{doc.state.message}</p>
        )}
        {doc.state.phase === "ready" && (
          <ul className="space-y-2">
            {doc.state.points.map((pt, i) => {
              const [label, ...rest] = pt.split(":");
              const value = rest.join(":").trim();
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    {value ? (
                      <><span className="font-semibold text-gray-900">{label}:</span> {value}</>
                    ) : (
                      pt
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [diff, setDiff] = useState<DiffState>({ phase: "idle" });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random()}`;

    // Add doc in uploading state
    setDocs((prev) => [
      ...prev.slice(0, 1), // max 2 docs — keep doc 1, replace doc 2 if exists
      { id, filename: file.name, size: file.size, state: { phase: "uploading" } },
    ]);

    // Move to extracting
    setDocs((prev) =>
      prev.map((d) => d.id === id ? { ...d, state: { phase: "extracting" } } : d)
    );

    // Call extract API
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/compare/extract", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setDocs((prev) =>
          prev.map((d) => d.id === id ? { ...d, state: { phase: "error", message: data.error ?? "Failed" } } : d)
        );
        return;
      }

      setDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, state: { phase: "ready", points: data.points, text: data.text } } : d
        )
      );
    } catch (e) {
      setDocs((prev) =>
        prev.map((d) => d.id === id ? { ...d, state: { phase: "error", message: String(e) } } : d)
      );
    }
  }, []);

  // Auto-run diff when 2 docs are both ready
  const runDiff = useCallback(async (d1: Document, d2: Document) => {
    if (d1.state.phase !== "ready" || d2.state.phase !== "ready") return;
    setDiff({ phase: "comparing" });
    try {
      const res = await fetch("/api/compare/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc1Text: d1.state.text,
          doc1Name: d1.filename,
          doc2Text: d2.state.text,
          doc2Name: d2.filename,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setDiff({ phase: "error", message: data.error ?? "Failed" }); return; }
      setDiff({ phase: "done", result: data });
    } catch (e) {
      setDiff({ phase: "error", message: String(e) });
    }
  }, []);

  // Trigger diff once both docs ready
  const handleDrop = useCallback(
    async (file: File) => {
      await processFile(file);
      // After processFile updates state, check in next tick
      setTimeout(() => {
        setDocs((prev) => {
          if (prev.length === 2 && prev[0].state.phase === "ready" && prev[1].state.phase === "ready") {
            runDiff(prev[0], prev[1]);
          }
          return prev;
        });
      }, 200);
    },
    [processFile, runDiff]
  );

  // Watch docs state to trigger diff when second doc finishes
  const prevDocsRef = useRef<Document[]>([]);
  if (docs !== prevDocsRef.current) {
    prevDocsRef.current = docs;
    if (
      docs.length === 2 &&
      docs[0].state.phase === "ready" &&
      docs[1].state.phase === "ready" &&
      diff.phase === "idle"
    ) {
      // Schedule diff
      setTimeout(() => runDiff(docs[0], docs[1]), 0);
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const file = files[0];
    if (!file) return;
    if (docs.length >= 2) {
      // Replace the second doc
      setDocs((prev) => [prev[0]]);
      setDiff({ phase: "idle" });
    }
    handleDrop(file);
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setDiff({ phase: "idle" });
  };

  const reset = () => { setDocs([]); setDiff({ phase: "idle" }); };

  const canUpload = docs.length < 2 || docs.some((d) => d.id === "placeholder");
  const doc1 = docs[0];
  const doc2 = docs[1];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Contract Comparison
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload your first document to see its key terms. Upload a second to see what changed.
          </p>
        </div>
        {docs.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* ── LEFT: Upload zone ─────────────────────────────────────────── */}
        <div className="w-64 shrink-0 flex flex-col gap-4">

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 px-6 text-center transition-all
              ${dragging
                ? "border-blue-400 bg-blue-50"
                : docs.length >= 2
                  ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
              }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dragging ? "bg-blue-100" : "bg-gray-100"}`}>
              <Upload size={22} className={dragging ? "text-blue-500" : "text-gray-400"} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {docs.length === 0 ? "Upload Document 1" : docs.length === 1 ? "Upload Document 2" : "Both docs loaded"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {docs.length === 0
                  ? "Your standard T&C or any contract"
                  : docs.length === 1
                    ? "The incoming contract to compare"
                    : "Remove a doc to upload another"
                }
              </p>
              <p className="text-xs text-gray-300 mt-2">PDF · DOCX · TXT · MD</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            disabled={docs.length >= 2}
          />

          {/* Steps guide */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How it works</p>
            {[
              { n: "1", text: "Upload your standard T&C or first contract", done: docs.length >= 1 },
              { n: "2", text: "See key terms extracted automatically", done: docs[0]?.state.phase === "ready" },
              { n: "3", text: "Upload the second contract to compare", done: docs.length >= 2 },
              { n: "4", text: "AI highlights every difference & risk", done: diff.phase === "done" },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                  step.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {step.done ? "✓" : step.n}
                </div>
                <p className={`text-xs leading-relaxed ${step.done ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Document list + diff ───────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1">

          {/* Empty state */}
          {docs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <FileText size={28} className="text-gray-200" />
              </div>
              <p className="text-sm font-semibold text-gray-400">No documents yet</p>
              <p className="text-xs text-gray-300 mt-1">Upload a document on the left to get started</p>
            </div>
          )}

          {/* Doc cards */}
          {doc1 && <DocCard doc={doc1} index={0} onRemove={() => removeDoc(doc1.id)} />}

          {/* Arrow between docs */}
          {doc1 && doc2 && (
            <div className="flex items-center gap-2 px-4">
              <div className="flex-1 border-t border-dashed border-gray-200" />
              <ArrowRight size={14} className="text-gray-300" />
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>
          )}

          {doc2 && <DocCard doc={doc2} index={1} onRemove={() => removeDoc(doc2.id)} />}

          {/* ── Diff section ── */}
          {diff.phase === "comparing" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <Loader2 size={24} className="animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Comparing documents…</p>
              <p className="text-xs text-gray-400 mt-1 animate-pulse">Reading all clauses and identifying differences</p>
            </div>
          )}

          {diff.phase === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Comparison failed</p>
                <p className="text-xs text-red-600 mt-0.5">{diff.message}</p>
                <button
                  onClick={() => { if (doc1 && doc2) runDiff(doc1, doc2); }}
                  className="mt-2 text-xs text-red-600 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {diff.phase === "done" && (
            <div className="space-y-4">
              {/* Risk banner */}
              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${SEV_BG[diff.result.riskLevel]}`}>
                <Shield size={20} className={`${SEV_TEXT[diff.result.riskLevel]} mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900">Comparison Result</p>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${SEV_BADGE[diff.result.riskLevel]}`}>
                      {diff.result.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{diff.result.summary}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Differences", value: diff.result.differences.length, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Critical / High", value: diff.result.differences.filter((d) => d.severity === "critical" || d.severity === "high").length, color: "text-red-600", bg: "bg-red-50" },
                  { label: "To Negotiate", value: diff.result.differences.filter((d) => d.recommendation === "Negotiate").length, color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Matching", value: diff.result.matching.length, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-white`}>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Differences list */}
              {diff.result.differences.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    Differences ({diff.result.differences.length})
                  </p>
                  <div className="space-y-2">
                    {diff.result.differences
                      .sort((a, b) => {
                        const o: Severity[] = ["critical", "high", "medium", "low"];
                        return o.indexOf(a.severity) - o.indexOf(b.severity);
                      })
                      .map((d, i) => <DifferenceCard key={i} diff={d} />)
                    }
                  </div>
                </div>
              )}

              {/* Matching clauses */}
              {diff.result.matching.length > 0 && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
                  <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Matching / Acceptable ({diff.result.matching.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {diff.result.matching.map((c) => (
                      <span key={c} className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
