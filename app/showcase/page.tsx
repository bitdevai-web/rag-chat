"use client";

import Link from "next/link";
import {
  FileSearch, AlertTriangle, CheckCircle, XCircle, ArrowRight,
  Shield, Zap, FileText, Scale, AlertCircle, Eye, Clock,
  ChevronRight, Star,
} from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

const STEPS = [
  {
    step: "01",
    icon: FileText,
    title: "Upload Your Standard T&C",
    desc: "Your baseline contract — the agreed terms your company always requires. Supports PDF, DOCX, and plain text.",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    step: "02",
    icon: FileSearch,
    title: "Upload the Incoming Contract",
    desc: "The vendor or partner's contract that needs review. Drop it in and the AI reads every clause immediately.",
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    step: "03",
    icon: Zap,
    title: "AI Analyses in Seconds",
    desc: "CogniBase compares every clause — payment terms, liability caps, IP ownership, termination rights, and more.",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    step: "04",
    icon: Shield,
    title: "Get a Full Risk Report",
    desc: "Receive a structured redline report with severity flags, exact clause comparisons, and clear recommendations.",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
];

const MOCK_FINDINGS = [
  {
    type: "missing",
    severity: "critical",
    clause: "Liability Cap",
    baseline: "Liability limited to 3× the contract value in any 12-month period.",
    incoming: null,
    risk: "No liability cap means your exposure is unlimited. This is a critical omission that must be resolved before signing.",
    recommendation: "Reject — insist on inserting your standard liability cap clause.",
    sevColor: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  {
    type: "modified",
    severity: "high",
    clause: "Payment Terms",
    baseline: "Net 30 days from invoice date.",
    incoming: "Net 60 days from receipt and approval of invoice by the vendor's finance team.",
    risk: "Extended to Net 60 with approval gate — could stretch to 90+ days in practice, impacting cash flow.",
    recommendation: "Negotiate — propose Net 45 maximum without an approval gate.",
    sevColor: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    type: "risky",
    severity: "high",
    clause: "IP Ownership",
    baseline: "All work product created under this agreement is owned by the client.",
    incoming: "Vendor retains ownership of all pre-existing IP and any derivative works.",
    risk: "Derivative works clause may capture deliverables you commissioned. Any custom work could legally belong to the vendor.",
    recommendation: "Reject — require explicit assignment of all deliverables to client.",
    sevColor: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    type: "modified",
    severity: "medium",
    clause: "Governing Law",
    baseline: "Laws of England and Wales.",
    incoming: "Laws of the State of Delaware, United States.",
    risk: "Dispute resolution would require US legal representation. Adds cost and complexity for an overseas entity.",
    recommendation: "Negotiate — request mutual agreement on England & Wales or international arbitration.",
    sevColor: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
];

const MOCK_ACCEPTABLE = ["Confidentiality", "Force Majeure", "Data Protection (GDPR)", "Notice Period"];

const TYPE_ICON: Record<string, React.ElementType> = {
  missing:  XCircle,
  modified: AlertCircle,
  risky:    AlertTriangle,
  added:    Eye,
};

const USE_CASES = [
  { icon: Scale,         title: "Vendor Contracts",    desc: "Review supplier agreements against your procurement standards before signing." },
  { icon: FileText,      title: "SaaS Agreements",     desc: "Spot unfavourable auto-renewal, data retention, or price escalation clauses." },
  { icon: Shield,        title: "NDAs & Partnerships",  desc: "Ensure confidentiality scope, term, and exceptions match your policy." },
  { icon: AlertTriangle, title: "Employment Contracts", desc: "Check IP assignment, non-compete, and restrictive covenant deviations." },
  { icon: Clock,         title: "Lease Agreements",    desc: "Compare rent review, break clauses, and dilapidations against your template." },
  { icon: Star,          title: "M&A Due Diligence",   desc: "Rapidly flag non-standard terms across hundreds of target-company contracts." },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <CogniBaseLogo height={36} variant="dark" />
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all"
          >
            Try free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <Zap size={12} /> New · Contract Comparison — powered by AI
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Know exactly what's different<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
            before you sign
          </span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          Upload your standard T&C and any incoming vendor or partner contract.
          CogniBase highlights every clause that differs, is missing, or is risky —
          in seconds, not days.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
          >
            <FileSearch size={16} /> Try the Comparison Tool
            <ArrowRight size={14} />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-all"
          >
            See demo output
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-8 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-2">How it works</h2>
        <p className="text-slate-400 text-center text-sm mb-10">Four steps from upload to risk report</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xs font-bold text-slate-500 mb-1">{s.step}</p>
                <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mock Demo Output */}
      <section id="demo" className="max-w-6xl mx-auto px-8 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Sample report output</h2>
        <p className="text-slate-400 text-center text-sm mb-10">This is what a real analysis looks like</p>

        {/* Risk banner */}
        <div className="bg-orange-950/40 border border-orange-700/50 rounded-2xl p-5 mb-5 flex items-start gap-4">
          <Shield size={22} className="text-orange-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <p className="text-sm font-bold text-white">standard-tc.pdf vs vendor-agreement.pdf</p>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-200 uppercase">
                High Risk
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              The incoming contract deviates significantly from your standard terms in four critical areas.
              The absence of a liability cap and unfavourable IP ownership clause represent the most urgent
              concerns and must be renegotiated before signing.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: "Clauses Analysed", value: "12", color: "text-blue-400" },
            { label: "Differences",       value: "4",  color: "text-amber-400" },
            { label: "Missing Clauses",   value: "1",  color: "text-red-400" },
            { label: "Added Clauses",     value: "0",  color: "text-indigo-400" },
            { label: "Risk Flags",        value: "3",  color: "text-orange-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Findings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 mb-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Findings (4)</p>
          {MOCK_FINDINGS.map((f, i) => {
            const Icon = TYPE_ICON[f.type] ?? AlertCircle;
            return (
              <div key={i} className={`rounded-xl border ${f.sevColor} overflow-hidden`}>
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <Icon size={15} className={
                    f.severity === "critical" ? "text-red-600" :
                    f.severity === "high"     ? "text-orange-600" : "text-amber-600"
                  } />
                  <span className="text-sm font-semibold text-gray-900 flex-1">{f.clause}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${f.badge}`}>
                    {f.severity}
                  </span>
                  <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                    {f.type}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
                <div className="px-4 pb-4 pt-2 border-t border-white/50 space-y-3">
                  {f.baseline && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Our Standard</p>
                      <p className="text-xs text-gray-700 bg-white/80 rounded-lg p-3 border border-white">{f.baseline}</p>
                    </div>
                  )}
                  {f.incoming && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Incoming Contract</p>
                      <p className="text-xs text-gray-700 bg-white/80 rounded-lg p-3 border border-white">{f.incoming}</p>
                    </div>
                  )}
                  {!f.incoming && (
                    <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3 border border-red-100 font-medium">
                      ✗ This clause is entirely absent from the incoming contract
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Risk</p>
                    <p className="text-xs text-gray-700">{f.risk}</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs border font-medium ${
                    f.recommendation.startsWith("Reject")    ? "bg-red-50 border-red-200 text-red-800" :
                    f.recommendation.startsWith("Negotiate") ? "bg-amber-50 border-amber-200 text-amber-800" :
                    "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}>
                    💡 {f.recommendation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Acceptable */}
        <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-300">Matching / Acceptable Clauses (4)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOCK_ACCEPTABLE.map((c) => (
              <span key={c} className="text-xs bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 px-3 py-1 rounded-full">
                ✓ {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-6xl mx-auto px-8 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Use it for any contract type</h2>
        <p className="text-slate-400 text-center text-sm mb-10">Works on any document where you have a baseline standard</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {USE_CASES.map((u) => {
            const Icon = u.icon;
            return (
              <div key={u.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{u.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{u.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to review your first contract?</h2>
          <p className="text-blue-100 text-sm mb-8 max-w-xl mx-auto">
            Sign in to CogniBase and run a comparison in under 30 seconds.
            No setup required — just upload and go.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-xl"
          >
            Get started free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        © 2026 CogniBase · Brainium Information Technologies Pvt Ltd
      </footer>
    </div>
  );
}
