"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { CogniBaseLogo } from "./CogniBaseLogo";
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
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="px-6 py-3 flex justify-center">
      <nav className="w-full max-w-6xl bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <CogniBaseLogo size={26} />
          <span className="font-bold text-gray-900 text-sm">CogniBase</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            My Knowledge Bases
          </Link>
          <span className="hover:text-gray-900 transition-colors cursor-default">Browse Features</span>
          <span className="hover:text-gray-900 transition-colors cursor-default">Get Support</span>
        </div>

        {/* User */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 font-medium">{username}</span>
            <ChevronDown size={13} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings size={14} /> Settings
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
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
