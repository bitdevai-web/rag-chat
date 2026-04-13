"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
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
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Server error. Make sure the app is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white flex flex-col items-center justify-center p-6">

      {/* Logo + name */}
      <div className="flex items-center gap-2.5 mb-8">
        <CogniBaseLogo size={32} />
        <span className="text-xl font-bold text-gray-900">CogniBase</span>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
      <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Default credentials hint */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
          <AlertCircle size={13} className="text-blue-400 flex-shrink-0" />
          Default: <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin123</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username (shown as Email address per design) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email address</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="admin"
              autoComplete="username"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="text-gray-400 hover:text-gray-600 ml-2">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 accent-blue-600" />
              Remember me
            </label>
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm">Forgot your password?</span>
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
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3 rounded-xl transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <span className="text-blue-600 font-medium cursor-pointer hover:text-blue-800">Sign up for free</span>
        </p>
      </div>
    </div>
  );
}
