"use client";

import Link from "next/link";
import {
  FileSearch, Brain, Database, MessageSquare, Shield, Zap,
  FileText, Search, Globe, Clock, CheckCircle, Upload,
  ArrowRight, Star, Users, Lock, Server, RefreshCw,
  BarChart3, BookMarked, Eye, AlertTriangle, Layers,
  ChevronRight, Building2, Scale, Stethoscope, GraduationCap,
} from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: "Local AI Embeddings",
    desc: "Documents are indexed using the all-MiniLM-L6-v2 model running entirely on your server via ONNX. No third-party embedding API required — your data never leaves your infrastructure.",
    tags: ["On-device", "No API cost", "Private"],
  },
  {
    icon: MessageSquare,
    title: "Natural Language Chat",
    desc: "Ask questions the way you think. Instead of searching through folders, type your question and get precise answers extracted from your documents in seconds, with source citations.",
    tags: ["Conversational", "Context-aware", "Streaming"],
  },
  {
    icon: FileSearch,
    title: "Contract Comparison & Redlining",
    desc: "Upload your standard T&C as a baseline. Every new vendor or partner contract is automatically compared clause by clause — missing terms, risky additions, and modified language are all flagged with severity ratings.",
    tags: ["Auto-compare", "Risk scoring", "Recommendations"],
  },
  {
    icon: Search,
    title: "Hybrid Search (Vector + Keyword)",
    desc: "Combines semantic vector search with BM25 keyword search using Reciprocal Rank Fusion (RRF). Finds relevant content even when the exact words differ — the best of both retrieval methods.",
    tags: ["Vector search", "BM25", "RRF fusion"],
  },
  {
    icon: Eye,
    title: "OCR for Scanned Documents",
    desc: "Upload scanned PDFs or image-based documents. CogniBase automatically detects image-only PDFs and runs OCR using Tesseract to extract text before indexing — no manual conversion needed.",
    tags: ["Auto-detect", "Tesseract OCR", "Scanned PDFs"],
  },
  {
    icon: Upload,
    title: "Multi-format Document Support",
    desc: "Upload PDFs, Word documents, PowerPoint presentations, Excel spreadsheets, Markdown, CSV, and plain text files. All formats are automatically parsed and indexed.",
    tags: ["PDF", "DOCX", "PPTX", "XLSX", "TXT", "MD", "CSV"],
  },
  {
    icon: Database,
    title: "Knowledge Base Organisation",
    desc: "Organise documents into separate knowledge bases by topic, project, or department. Each knowledge base has isolated document storage, chat history, and comparison baselines.",
    tags: ["Isolated", "Categorised", "Scalable"],
  },
  {
    icon: Zap,
    title: "AI-Generated Summaries",
    desc: "Generate a comprehensive AI summary of any knowledge base with one click. The summary covers main topics, key insights, and document types — auto-updated as new documents are added.",
    tags: ["One-click", "Comprehensive", "Stored"],
  },
  {
    icon: Globe,
    title: "Bring Your Own LLM",
    desc: "Connect your own Anthropic Claude or OpenAI GPT API key for chat completions. Switch providers and models anytime from the Settings page. No vendor lock-in.",
    tags: ["Anthropic", "OpenAI", "Configurable"],
  },
  {
    icon: Shield,
    title: "Self-hosted & Secure",
    desc: "CogniBase runs entirely on your own server. All documents, embeddings, and chat history are stored locally in SQLite and LanceDB. Only your LLM chat calls go to the external provider you configure.",
    tags: ["Self-hosted", "Local storage", "GDPR-friendly"],
  },
  {
    icon: Users,
    title: "Multi-user & Role-based Access",
    desc: "Create teams, invite members, and control access per knowledge base. Roles include Admin, Editor, and Viewer. Full audit log tracks who accessed or modified what.",
    tags: ["Teams", "RBAC", "Audit log"],
  },
  {
    icon: RefreshCw,
    title: "Real-time Processing",
    desc: "Upload a document and it is indexed in the background while you continue working. Status updates automatically — Processing → OCR Running → Processed.",
    tags: ["Background", "Non-blocking", "Live status"],
  },
  {
    icon: Clock,
    title: "Persistent Chat History",
    desc: "Chat conversations are saved per knowledge base with full thread management. Create multiple conversation threads, pick up where you left off, or clear history anytime.",
    tags: ["Persistent", "Per-KB", "Threads"],
  },
  {
    icon: BookMarked,
    title: "Baseline Document Management",
    desc: "Mark any document as the baseline for contract comparison. Every subsequent upload is automatically compared against it and the full risk report is stored and viewable inline.",
    tags: ["Auto-compare", "Stored results", "Inline report"],
  },
  {
    icon: Lock,
    title: "Secure Authentication",
    desc: "HMAC-SHA256 signed session tokens with expiry. Bcrypt password hashing. Google OAuth 2.0 support. Session cookies with secure flags. No plaintext credentials stored.",
    tags: ["HMAC tokens", "Bcrypt", "OAuth 2.0"],
  },
  {
    icon: BarChart3,
    title: "Source Citations & Match Scores",
    desc: "Every AI answer shows exactly which document and section the information came from, with a percentage match score. Click any citation to jump directly to the relevant passage.",
    tags: ["Traceable", "Clickable", "Transparent"],
  },
];

const FORMATS = [
  { ext: "PDF", desc: "Text & Scanned (OCR)", icon: "📄" },
  { ext: "DOCX", desc: "Microsoft Word", icon: "📝" },
  { ext: "PPTX", desc: "PowerPoint", icon: "📊" },
  { ext: "XLSX", desc: "Excel Spreadsheets", icon: "📈" },
  { ext: "TXT", desc: "Plain Text", icon: "📃" },
  { ext: "MD", desc: "Markdown", icon: "📋" },
  { ext: "CSV", desc: "Comma-separated", icon: "📊" },
];

const USE_CASES = [
  { icon: Scale,          color: "from-blue-400 to-cyan-500",    title: "Legal & Contracts",    desc: "Review vendor agreements, compare clauses against standard T&C, flag risky deviations before signing." },
  { icon: Building2,      color: "from-indigo-400 to-blue-500",  title: "HR & Compliance",      desc: "Index policy documents, employee handbooks, and compliance guidelines. Instant answers for HR queries." },
  { icon: Stethoscope,    color: "from-cyan-400 to-teal-500",    title: "Healthcare",           desc: "Organise clinical protocols, research papers, and SOPs. Ask questions across thousands of documents." },
  { icon: GraduationCap,  color: "from-violet-400 to-indigo-500",title: "Education & Research", desc: "Build searchable knowledge bases from research papers, lecture notes, and course material." },
  { icon: BarChart3,      color: "from-teal-400 to-cyan-500",    title: "Finance & Audit",      desc: "Index financial reports, audit trails, and regulatory filings. Surface key figures instantly." },
  { icon: Layers,         color: "from-blue-400 to-indigo-500",  title: "Product & Engineering",desc: "Search across technical specs, API docs, and RFCs. Keep teams aligned on a single source of truth." },
];

const TECH_STACK = [
  { label: "Frontend",    value: "Next.js 14 App Router · React · Tailwind CSS" },
  { label: "Backend",     value: "Next.js API Routes · Node.js 20" },
  { label: "Database",    value: "SQLite (better-sqlite3) · LanceDB (vector)" },
  { label: "Embeddings",  value: "all-MiniLM-L6-v2 via ONNX Runtime (local)" },
  { label: "OCR",         value: "Tesseract.js · pdftoppm (poppler)" },
  { label: "Search",      value: "Vector + BM25 + Reciprocal Rank Fusion" },
  { label: "LLM",         value: "Anthropic Claude · OpenAI GPT (your API key)" },
  { label: "Auth",        value: "HMAC-SHA256 sessions · Bcrypt · Google OAuth 2.0" },
  { label: "Deployment",  value: "PM2 · Docker · Any Linux VPS" },
];

const PRICING = [
  {
    name: "Pilot",
    server: "Hetzner CX22",
    serverCost: "₹400",
    model: "GPT-4o Mini",
    apiCost: "₹225",
    total: "₹625",
    usage: "100 msgs/day",
    users: "Up to 5 users",
    color: "border-slate-200",
    badge: "",
  },
  {
    name: "Team",
    server: "Hetzner CX32",
    serverCost: "₹720",
    model: "Claude Haiku",
    apiCost: "₹1,300",
    total: "₹2,020",
    usage: "100 msgs/day",
    users: "Up to 30 users",
    color: "border-cyan-300",
    badge: "Most Popular",
  },
  {
    name: "Business",
    server: "Hetzner CCX23",
    serverCost: "₹1,600",
    model: "Claude Sonnet",
    apiCost: "₹9,360",
    total: "₹10,960",
    usage: "200 msgs/day",
    users: "Unlimited users",
    color: "border-indigo-300",
    badge: "Best Quality",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShowcasePage() {
  return (
    <div className="min-h-screen" style={{
      background: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(6,182,212,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(99,102,241,0.06) 0%, transparent 60%), #f0f4f8"
    }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <CogniBaseLogo height={36} variant="light" />
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <a href="#features"  className="hover:text-slate-800 transition-colors">Features</a>
          <a href="#usecases"  className="hover:text-slate-800 transition-colors">Use Cases</a>
          <a href="#tech"      className="hover:text-slate-800 transition-colors">Tech Stack</a>
          <a href="#pricing"   className="hover:text-slate-800 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-800 transition-colors font-medium">Sign in</Link>
          <Link href="/login" className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all logo-gradient-bg hover:opacity-90 shadow-sm">
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border mb-8"
          style={{ background: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.3)", color: "#0891b2" }}>
          <Zap size={11} /> AI-Powered · Self-hosted · Privacy-first
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
          Your documents,<br />
          <span className="logo-gradient-text">intelligently organised</span>
        </h1>

        <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          CogniBase transforms your documents into a searchable knowledge base.
          Upload any file, ask questions in plain English, compare contracts automatically,
          and get instant cited answers — all running on your own server.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/login" className="inline-flex items-center gap-2 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-sm logo-gradient-bg hover:opacity-90 transition-all">
            <Brain size={16} /> Start Using CogniBase
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 font-semibold text-sm px-7 py-3.5 rounded-xl transition-all bg-white/60">
            Explore Features <ChevronRight size={14} />
          </a>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16">
          {[
            { value: "16+",     label: "Core Features" },
            { value: "7",       label: "File Formats" },
            { value: "₹0",      label: "Embedding Cost" },
            { value: "100%",    label: "Self-hosted" },
          ].map((s) => (
            <div key={s.label} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 py-4 px-3 shadow-sm">
              <p className="text-2xl font-bold logo-gradient-text">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported formats */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Supported File Formats</p>
          <div className="flex flex-wrap gap-3">
            {FORMATS.map((f) => (
              <div key={f.ext} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:border-cyan-300 transition-colors">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">{f.ext}</p>
                  <p className="text-[10px] text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Everything you need</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            A complete AI document platform — built for teams who need answers, not just search results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-cyan-300 hover:shadow-md transition-all group shadow-sm">
                <div className="w-10 h-10 rounded-xl logo-gradient-bg flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                      style={{ background: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.2)", color: "#0891b2" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="rounded-3xl p-10 logo-gradient-bg shadow-lg">
          <h2 className="text-2xl font-bold text-white text-center mb-2">How CogniBase works</h2>
          <p className="text-white/70 text-sm text-center mb-10">From document upload to cited answer in seconds</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {[
              { step: "1", icon: Upload,      title: "Upload",          desc: "Add PDFs, Word docs, spreadsheets. Scanned docs are OCR'd automatically." },
              { step: "2", icon: Brain,       title: "Auto-index",      desc: "Text is chunked, embedded locally using ONNX, and stored in LanceDB." },
              { step: "3", icon: Search,      title: "Hybrid search",   desc: "Vector + keyword search retrieves the most relevant chunks." },
              { step: "4", icon: Zap,         title: "LLM answers",     desc: "Your chosen LLM generates a precise answer from the retrieved context." },
              { step: "5", icon: CheckCircle, title: "Cited results",   desc: "Answer includes source document name and match % — always traceable." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-3 shadow-sm">
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="text-[10px] font-bold text-white/50 mb-1">STEP {s.step}</div>
                  <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                  <p className="text-xs text-white/65 leading-relaxed">{s.desc}</p>
                  {i < 4 && <ArrowRight size={16} className="text-white/30 mt-3 hidden md:block rotate-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="usecases" className="max-w-7xl mx-auto px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Built for every industry</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Wherever documents contain knowledge that teams need to access quickly — CogniBase fits.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((u) => {
            const Icon = u.icon;
            return (
              <div key={u.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-cyan-300 hover:shadow-md transition-all group shadow-sm">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${u.color} flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">{u.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{u.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contract comparison highlight */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6"
                style={{ background: "rgba(6,182,212,0.08)", color: "#0891b2" }}>
                <FileSearch size={11} /> Featured Capability
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4 leading-tight">
                Automatic contract<br />comparison & redlining
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Upload your standard T&C as the baseline once. Every new vendor or partner contract
                uploaded is automatically compared — the AI reads every clause and flags what changed,
                what&apos;s missing, and what&apos;s risky, with plain-English recommendations.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Detects modified, missing, added, and risky clauses",
                  "Severity rating: low / medium / high / critical per clause",
                  "Recommendation per finding: Accept / Negotiate / Reject",
                  "Full report stored inline — no need to re-run",
                  "Works on PDF, DOCX, and scanned documents (OCR)",
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <CheckCircle size={13} className="text-cyan-500 mt-0.5 shrink-0" /> {pt}
                  </li>
                ))}
              </ul>
              <Link href="/compare" className="inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-xl logo-gradient-bg hover:opacity-90 transition-all shadow-sm">
                Try Contract Compare <ArrowRight size={14} />
              </Link>
            </div>
            <div className="bg-slate-50 border-l border-slate-200 p-8 flex flex-col justify-center">
              {/* Mock report preview */}
              <div className="bg-white rounded-2xl border border-orange-200 p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-orange-500" />
                  <span className="text-xs font-bold text-slate-800">IP Ownership</span>
                  <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full">CRITICAL</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-1"><span className="font-semibold text-slate-600">Baseline:</span> All work product owned by client upon creation.</p>
                <p className="text-[11px] text-slate-500 mb-2"><span className="font-semibold text-slate-600">Incoming:</span> Vendor retains all IP including derivative works.</p>
                <span className="text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 px-2 py-1 rounded-lg">💡 Reject — reclaim IP ownership</span>
              </div>
              <div className="bg-white rounded-2xl border border-amber-200 p-4 mb-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">Payment Terms</span>
                  <span className="ml-auto text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">HIGH</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Changed from Net 30 to Net 60 with approval gate — cash flow impact.</p>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg">💡 Negotiate — propose Net 45</span>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">Matching Clauses</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Confidentiality", "Force Majeure", "GDPR Compliance"].map(c => (
                    <span key={c} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">✓ {c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="tech" className="max-w-7xl mx-auto px-8 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Technology stack</h2>
          <p className="text-slate-500 text-sm">Open, modern, and designed to run anywhere</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {TECH_STACK.map((t, i) => (
              <div key={i} className="px-6 py-5 border-b border-r border-slate-100 last:border-r-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.label}</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{t.value}</p>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2"
            style={{ background: "rgba(6,182,212,0.04)" }}>
            <Server size={13} className="text-cyan-500" />
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Privacy-first:</span> Embeddings run locally. Documents stored in SQLite + LanceDB on your server. Only LLM chat calls leave your infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Transparent pricing</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            You pay only for the server you host and the LLM API calls you make. No per-seat fees, no hidden costs.
            Embeddings are always free — they run on your server.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PRICING.map((p) => (
            <div key={p.name} className={`bg-white rounded-3xl border-2 ${p.color} p-7 shadow-sm relative`}>
              {p.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold text-white px-3 py-1 rounded-full logo-gradient-bg shadow-sm whitespace-nowrap">
                    {p.badge}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-800 mb-1">{p.name}</h3>
              <p className="text-xs text-slate-400 mb-5">{p.usage} · {p.users}</p>

              <div className="text-3xl font-bold logo-gradient-text mb-1">{p.total}</div>
              <p className="text-xs text-slate-400 mb-6">estimated / month</p>

              <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Server ({p.server})</span>
                  <span className="font-semibold">{p.serverCost}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LLM API ({p.model})</span>
                  <span className="font-semibold">{p.apiCost}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Embeddings</span>
                  <span className="font-semibold text-emerald-600">₹0 (local)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400">
          Prices are estimates. API costs scale with actual usage. Server costs are fixed.
          <span className="mx-2">·</span>
          USD/EUR converted at current rates.
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="rounded-3xl p-12 text-center logo-gradient-bg shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-white/75 text-sm mb-8 max-w-xl mx-auto leading-relaxed">
            Sign in and create your first knowledge base in under 2 minutes.
            No setup wizard, no credit card — just upload a document and start asking questions.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login" className="inline-flex items-center gap-2 bg-white text-slate-800 hover:bg-slate-50 font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-md">
              <Brain size={16} /> Start Using CogniBase
            </Link>
            <Link href="/compare" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold text-sm px-8 py-3.5 rounded-xl transition-all">
              <FileSearch size={16} /> Try Contract Compare
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <CogniBaseLogo height={32} variant="light" />
            <p className="text-xs text-slate-400 mt-2">AI-Powered Knowledge Management</p>
          </div>
          <div className="flex items-center gap-8 text-xs text-slate-400">
            <a href="#features"  className="hover:text-slate-600 transition-colors">Features</a>
            <a href="#usecases"  className="hover:text-slate-600 transition-colors">Use Cases</a>
            <a href="#tech"      className="hover:text-slate-600 transition-colors">Tech Stack</a>
            <a href="#pricing"   className="hover:text-slate-600 transition-colors">Pricing</a>
            <Link href="/login"  className="hover:text-slate-600 transition-colors">Sign In</Link>
          </div>
          <p className="text-xs text-slate-400">© 2026 Brainium Information Technologies Pvt Ltd</p>
        </div>
      </footer>
    </div>
  );
}
