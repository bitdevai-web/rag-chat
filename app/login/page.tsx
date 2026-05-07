"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, Lock, FileText, Brain, Database, MessageSquare } from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Server error. Make sure the app is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{
      background: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(6,182,212,0.08) 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 65%), #f0f4f8"
    }}>

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14"
        style={{ background: "linear-gradient(145deg, rgba(6,182,212,0.06) 0%, rgba(99,102,241,0.06) 100%)" }}
      >
        <div>
          <CogniBaseLogo height={42} variant="light" />

          <div className="mt-14 mb-6">
            <h1 className="text-4xl font-bold text-slate-800 leading-tight mb-4">
              Your documents,<br />
              <span className="logo-gradient-text">intelligently organised</span>
            </h1>
            <p className="text-slate-500 text-base leading-relaxed max-w-sm">
              Upload any document, ask questions in plain English, and get instant answers with exact source citations.
            </p>
          </div>

          {/* Gradient divider */}
          <div className="h-0.5 w-16 rounded-full logo-gradient-bg mb-10" />
        </div>

        <div className="space-y-3">
          {[
            { icon: Brain,         title: "Local AI Embeddings",   desc: "No data leaves your server",              grad: "from-cyan-400 to-cyan-500" },
            { icon: Database,      title: "Vector Search",          desc: "Semantic + keyword hybrid retrieval",     grad: "from-indigo-400 to-indigo-500" },
            { icon: MessageSquare, title: "Conversational AI",      desc: "Chat with your documents naturally",      grad: "from-cyan-500 to-indigo-500" },
            { icon: FileText,      title: "Multi-format Support",   desc: "PDF, DOCX, XLSX, TXT and more",           grad: "from-indigo-400 to-cyan-500" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-white/80 shadow-sm">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${f.grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <f.icon size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">© 2026 CogniBase · Brainium Information Technologies Pvt Ltd</p>
      </div>

      {/* Right — login form */}
      <div className="w-full lg:w-[48%] flex flex-col items-center justify-center p-6">
        <div className="lg:hidden mb-10">
          <CogniBaseLogo height={40} variant="light" />
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-slate-200 p-10"
          style={{ boxShadow: "0 4px 24px rgba(6,182,212,0.08), 0 2px 8px rgba(99,102,241,0.06)" }}
        >
          {/* Gradient top bar */}
          <div className="h-1 w-full rounded-full logo-gradient-bg mb-8" />

          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your CogniBase account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <input
                type="text" value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter username" autoComplete="username" required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition-all bg-slate-50"
                style={{ ["--tw-ring-color" as string]: "rgba(6,182,212,0.3)" }}
                onFocus={e => { e.target.style.borderColor = "#06b6d4"; e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.15)"; }}
                onBlur={e  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 transition-all"
                onFocus={() => {}} /* handled per child */
              >
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••" autoComplete="current-password" required
                  className="flex-1 text-sm text-slate-800 placeholder-slate-300 outline-none bg-transparent"
                  onFocus={e  => { (e.target.parentElement as HTMLElement).style.borderColor = "#06b6d4"; (e.target.parentElement as HTMLElement).style.boxShadow = "0 0 0 3px rgba(6,182,212,0.15)"; }}
                  onBlur={e   => { (e.target.parentElement as HTMLElement).style.borderColor = ""; (e.target.parentElement as HTMLElement).style.boxShadow = ""; }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="text-slate-400 hover:text-slate-600 ml-2">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm mt-2 logo-gradient-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="lg:hidden text-slate-400 text-xs mt-8">© 2026 CogniBase</p>
      </div>
    </div>
  );
}
