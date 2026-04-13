"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Database, Loader2, Upload, MessageSquare, Zap } from "lucide-react";

export default function NewKBPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      router.push(`/kb/${data.id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Upload, title: "Upload Documents", desc: "Add PDF, Word, PowerPoint, or text files to your knowledge base" },
    { icon: Zap, title: "Process Documents", desc: "Let AI analyze and index your documents for search" },
    { icon: MessageSquare, title: "Start Chatting", desc: "Ask questions and get intelligent answers from your documents" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Knowledge Base</h1>
      <p className="text-sm text-gray-500 mb-8">Create a new knowledge base to organize and chat with your documents</p>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Knowledge Base Details</h2>
        <p className="text-xs text-gray-400 mb-5">Provide basic information about your knowledge base</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g., Product Documentation, HR Policies"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this knowledge base contains..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {loading ? "Creating…" : "Create Knowledge Base"}
            </button>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">What&apos;s Next?</h2>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
