"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LogOut, Settings, ChevronDown } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [username, setUsername] = useState("user");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.username) setUsername(d.username); })
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
      <nav className="w-full max-w-6xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-cyan-300/30 hover:border-cyan-400/40 px-6 py-3.5 flex items-center justify-between transition-all duration-300">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md">C</div>
          <span className="font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 bg-clip-text text-transparent text-base">CogniBase</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-cyan-600 transition-colors font-medium">
            My Knowledge Bases
          </Link>
          <Link href="/features" className="hover:text-blue-600 transition-colors font-medium">
            Browse Features
          </Link>
          <Link href="/support" className="hover:text-indigo-600 transition-colors font-medium">
            Get Support
          </Link>
        </div>

        {/* User */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-cyan-300/40">
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 font-medium">{username}</span>
            <ChevronDown size={13} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-cyan-200/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden backdrop-blur-sm">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-cyan-50/60 hover:text-cyan-600 transition-colors"
              >
                <Settings size={14} /> Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
