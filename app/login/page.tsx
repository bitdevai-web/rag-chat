"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, AlertCircle, Database, MessageSquare, FileText, Brain, Lock } from "lucide-react";

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
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Server error. Make sure the app is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Wallpaper background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/login-wallpaper.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Left sidebar - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10">
        {/* Top section with logo */}
        <div>
          <div className="flex items-center gap-5 mb-16">
            <Image src="/cognibase-logo-dark.svg" alt="CogniBase" width={200} height={48} className="h-12 w-auto object-contain" priority />
            <div>
              <p className="text-slate-400 text-sm">AI-Powered Knowledge Management</p>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Intelligent Document <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Analysis</span>
          </h1>
          <p className="text-slate-400 text-lg mb-12">
            Transform your documents into searchable knowledge with AI-powered retrieval and analysis.
          </p>
        </div>

        {/* Features grid */}
        <div className="space-y-6">
          <div className="flex items-start gap-4 bg-teal-950/20 backdrop-blur-sm p-5 rounded-xl border border-teal-700/30 hover:border-teal-600/50 transition-all">
            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain size={20} className="text-teal-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">AI-Powered Analysis</h3>
              <p className="text-slate-400 text-sm">Advanced embeddings and semantic search</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-purple-950/20 backdrop-blur-sm p-5 rounded-xl border border-purple-700/30 hover:border-purple-600/50 transition-all">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Database size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Vector Database</h3>
              <p className="text-slate-400 text-sm">Fast and accurate document retrieval</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-cyan-950/20 backdrop-blur-sm p-5 rounded-xl border border-cyan-700/30 hover:border-cyan-600/50 transition-all">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare size={20} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Conversational AI</h3>
              <p className="text-slate-400 text-sm">Chat with your documents naturally</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-indigo-950/20 backdrop-blur-sm p-5 rounded-xl border border-indigo-700/30 hover:border-indigo-600/50 transition-all">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Multi-Format Support</h3>
              <p className="text-slate-400 text-sm">PDF, DOCX, XLSX, TXT and more</p>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="text-slate-500 text-sm">
          <p>© 2026 CogniBase. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Mobile logo - only visible on small screens */}
        <div className="lg:hidden flex flex-col items-center gap-4 mb-12">
          <Image src="/cognibase-logo-dark.svg" alt="CogniBase" width={200} height={48} className="h-12 w-auto object-contain" priority />
          <p className="text-slate-400 text-sm text-center">AI-Powered Knowledge Management</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-10">
          
          <div className="hidden lg:flex justify-center mb-8">
            <Image src="/cognibase-logo-dark.svg" alt="CogniBase" width={200} height={48} className="h-11 w-auto object-contain" priority />
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2">Welcome back</h2>
          <p className="text-center text-slate-400 text-sm mb-10">Sign in to your account to continue</p>

          {/* Default credentials hint */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-teal-950/40 to-teal-900/20 border border-teal-700/40 rounded-lg px-4 py-3 mb-8 text-xs text-teal-300">
            <AlertCircle size={14} className="text-teal-400 flex-shrink-0" />
            <span>Default credentials: <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin123</span></span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Email address</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="admin"
                autoComplete="username"
                required
                className="w-full border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-all bg-slate-800/50 backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Password</label>
              <div className="flex items-center border border-slate-700 rounded-lg px-4 py-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all bg-slate-800/50 backdrop-blur-sm">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  className="flex-1 text-sm text-white placeholder-slate-600 outline-none bg-transparent"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-500 hover:text-teal-400 transition-colors ml-2">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between text-sm pt-2">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-600 accent-teal-500 cursor-pointer" />
                Remember me
              </label>
              <span className="text-teal-400 hover:text-teal-300 cursor-pointer text-sm transition-colors">Forgot your password?</span>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/50 border border-red-700/40 rounded-lg px-4 py-3 text-sm text-red-300">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-all mt-8 shadow-lg shadow-teal-500/30"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {loading ? "Signing in…" : "Sign in →"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-xs text-slate-500">or continue with</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>

            {/* Google OAuth */}
            <a
              href="/api/auth/oauth/google"
              className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-200 text-sm font-medium py-3 rounded-lg transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.1C9.5 35.7 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C37 38.8 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Sign in with Google
            </a>
          </form>
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden text-slate-500 text-xs mt-10 text-center">© 2026 CogniBase. All rights reserved.</p>
      </div>
    </div>
  );
}
