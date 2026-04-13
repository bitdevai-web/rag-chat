"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, Lock, User } from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials"); return; }
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Server error. Make sure the app is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand / illustration ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-700 p-12 relative overflow-hidden">

        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-300/20 rounded-full blur-2xl" />

        {/* Floating document cards */}
        <div className="absolute top-32 right-16 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-4 w-52 rotate-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-white/30 rounded-md" />
            <div className="h-2 bg-white/40 rounded w-24" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 bg-white/30 rounded w-full" />
            <div className="h-1.5 bg-white/30 rounded w-4/5" />
            <div className="h-1.5 bg-white/30 rounded w-3/5" />
          </div>
        </div>

        <div className="absolute bottom-40 right-8 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-4 w-44 -rotate-2 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-cyan-300/50 rounded-md" />
            <div className="h-2 bg-white/40 rounded w-20" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 bg-white/30 rounded w-full" />
            <div className="h-1.5 bg-white/30 rounded w-2/3" />
          </div>
        </div>

        {/* Chat bubble mockup */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-3 w-56">
          <div className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-white/90 text-xs">Who handles the SaveLah project?</p>
          </div>
          <div className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3 ml-4">
            <p className="text-white text-xs font-medium">Based on your documents, Sarah Chen is the project lead for SaveLah.</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-3 h-3 bg-white/40 rounded" />
              <div className="h-1 bg-white/40 rounded w-16" />
              <span className="text-white/60 text-[10px]">94% match</span>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="relative z-10 mt-auto">
          <div className="flex items-center gap-3 mb-6">
            <CogniBaseLogo size={40} variant="white" />
            <span className="text-white text-xl font-bold tracking-tight">CogniBase</span>
          </div>
          <h2 className="text-white text-2xl font-bold leading-snug mb-3">
            Your documents,<br />intelligently unlocked.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Upload any document and ask questions in plain English. CogniBase finds answers instantly — with exact source references.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {["PDF", "DOCX", "PPTX", "XLSX", "TXT"].map((fmt) => (
              <span key={fmt} className="text-xs text-white/80 bg-white/15 border border-white/20 rounded-full px-3 py-1">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">

        {/* Mobile logo (hidden on lg) */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <CogniBaseLogo size={32} />
          <span className="font-bold text-gray-900 text-lg">CogniBase</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Logo + title */}
          <div className="mb-8">
            <div className="hidden lg:flex items-center gap-3 mb-6">
              <CogniBaseLogo size={36} />
              <span className="font-bold text-gray-900 text-xl tracking-tight">CogniBase</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
          </div>

          {/* Default credentials hint */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
            <Lock size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <span className="font-semibold">Default credentials</span>
              <br />
              Username: <span className="font-mono font-semibold">admin</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono font-semibold">admin123</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Username</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <User size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Lock size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="ml-2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3 rounded-xl transition-all shadow-sm"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            CogniBase · Intelligent Document Companion
          </p>
        </div>
      </div>
    </div>
  );
}
