"use client";
import {
  FileText, MessageSquare, Zap, Shield, Search, Upload,
  Globe, Clock, CheckCircle, Database, Brain, RefreshCw,
} from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

const features = [
  {
    icon: Upload,
    title: "Multi-format Document Support",
    desc: "Upload PDFs, Word documents, PowerPoint presentations, Excel spreadsheets, Markdown, and plain text files. CogniBase handles them all automatically.",
    tags: ["PDF", "DOCX", "PPTX", "XLSX", "TXT", "MD"],
  },
  {
    icon: Brain,
    title: "Local AI Embeddings",
    desc: "Documents are indexed using the all-MiniLM-L6-v2 model running entirely on your server via ONNX — no third-party embedding API required. Your data never leaves your infrastructure.",
    tags: ["On-device", "No API cost", "Private"],
  },
  {
    icon: MessageSquare,
    title: "Natural Language Chat",
    desc: "Ask questions the way you think. Instead of searching through folders, simply type your question and get precise answers extracted from your documents in seconds.",
    tags: ["Conversational", "Context-aware", "Streaming"],
  },
  {
    icon: Search,
    title: "Source Citations",
    desc: "Every answer comes with exact references — which document the information was found in and a match percentage — so you can always verify the source.",
    tags: ["Traceable", "Accurate", "Transparent"],
  },
  {
    icon: Database,
    title: "Knowledge Base Organisation",
    desc: "Organise your documents into separate knowledge bases (e.g. Legal, HR, Finance). Each knowledge base has its own indexed documents and chat history.",
    tags: ["Categories", "Isolated", "Searchable"],
  },
  {
    icon: Zap,
    title: "AI-Generated Summaries",
    desc: "Generate a comprehensive AI summary of any knowledge base with one click. The summary covers main topics, key insights, and document types.",
    tags: ["One-click", "Comprehensive", "Stored"],
  },
  {
    icon: Globe,
    title: "Bring Your Own LLM",
    desc: "Connect your own Anthropic Claude or OpenAI GPT API key for chat completions. Switch providers and models anytime from the Settings page.",
    tags: ["Anthropic", "OpenAI", "Configurable"],
  },
  {
    icon: Shield,
    title: "Self-hosted & Secure",
    desc: "CogniBase runs entirely on your own server. All documents, embeddings, and chat history are stored locally in SQLite and LanceDB — nothing is sent to external services except your chosen LLM.",
    tags: ["Self-hosted", "Encrypted cookies", "Local storage"],
  },
  {
    icon: RefreshCw,
    title: "Real-time Processing",
    desc: "Upload a document and it's indexed in the background while you continue working. Status updates automatically as processing completes.",
    tags: ["Background", "Non-blocking", "Live status"],
  },
  {
    icon: Clock,
    title: "Persistent Chat History",
    desc: "Chat conversations are saved per knowledge base so you can pick up where you left off. Clear history anytime with one click.",
    tags: ["Persistent", "Per-KB", "Clearable"],
  },
];

const formats = [
  { ext: "PDF", desc: "Portable Document Format" },
  { ext: "DOCX", desc: "Microsoft Word" },
  { ext: "PPTX", desc: "PowerPoint Presentations" },
  { ext: "XLSX", desc: "Excel Spreadsheets" },
  { ext: "TXT", desc: "Plain Text" },
  { ext: "MD", desc: "Markdown" },
  { ext: "CSV", desc: "Comma-separated Values" },
];

export default function FeaturesPage() {
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-200 mb-5">
          <CogniBaseLogo size={30} variant="white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Browse Features</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
          CogniBase transforms how you interact with your documents. Upload any file, ask questions in plain English, and get instant answers — with exact source citations.
        </p>
      </div>

      {/* Supported formats strip */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Supported File Formats</p>
        <div className="flex flex-wrap gap-3">
          {formats.map((f) => (
            <div key={f.ext} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <FileText size={14} className="text-blue-500" />
              <div>
                <p className="text-xs font-bold text-gray-800">{f.ext}</p>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {features.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <f.icon size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-2xl p-8 text-white">
        <h2 className="text-lg font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Create a Knowledge Base", desc: "Organise your documents by topic or project" },
            { step: "2", title: "Upload Documents", desc: "Drag & drop PDFs, Word docs, spreadsheets and more" },
            { step: "3", title: "Auto-indexing", desc: "CogniBase reads and indexes everything automatically" },
            { step: "4", title: "Ask Questions", desc: "Get instant, cited answers in plain English" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
                {s.step}
              </div>
              <p className="font-semibold text-sm mb-1">{s.title}</p>
              <p className="text-white/70 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack note */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={14} className="text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">Privacy-first architecture</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Embeddings run locally using <span className="font-mono font-medium">all-MiniLM-L6-v2</span> via ONNX (~80 MB, auto-downloaded on first use). Documents are stored in SQLite + LanceDB on your server. Only your LLM chat calls go to the external provider you configure.
        </p>
      </div>
    </div>
  );
}
