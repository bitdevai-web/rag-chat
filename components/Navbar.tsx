"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LogOut, Settings, ChevronDown, Sun, Moon, Users, Shield } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function Navbar() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("user");
  const [userRole, setUserRole] = useState<string>("member");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.username) { setUsername(d.username); setUserRole(d.role ?? "member"); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = async () => {
    setMenuOpen(false);
    try {
      const logoutRes = await fetch("/api/auth/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (logoutRes.ok) {
        // Use replace to prevent back button navigation to dashboard
        router.replace("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      router.replace("/login");
    }
  };

  return (
    <div className="px-6 py-3 flex justify-center">
      <nav className="w-full max-w-6xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-lg border border-cyan-300/30 hover:border-cyan-400/40 dark:border-cyan-500/20 dark:hover:border-cyan-400/30 px-6 py-3.5 flex items-center justify-between transition-all duration-300">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
          <Image src="/cognibase-logo.svg" alt="CogniBase" width={160} height={38} className="h-9 w-auto object-contain dark:hidden" priority />
          <Image src="/cognibase-logo-dark.svg" alt="CogniBase" width={160} height={38} className="h-9 w-auto object-contain hidden dark:block" priority />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-slate-300">
          <Link href="/dashboard" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium">
            My Knowledge Bases
          </Link>
          <Link href="/features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
            Browse Features
          </Link>
          <Link href="/support" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
            Get Support
          </Link>
        </div>

        {/* Theme toggle + User */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-cyan-300/40">
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 dark:text-slate-200 font-medium">{username}</span>
            <ChevronDown size={13} className="text-gray-400 dark:text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-cyan-200/40 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden backdrop-blur-sm">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-cyan-50/60 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                <Settings size={14} /> Settings
              </Link>
              <Link
                href="/team"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-cyan-50/60 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                <Users size={14} /> Teams
              </Link>
              {userRole === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-cyan-50/60 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <Shield size={14} /> Admin Panel
                </Link>
              )}
              <div className="border-t border-gray-100 dark:border-slate-800 my-1" />
              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
        </div>
      </nav>
    </div>
  );
}
