"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LogOut, Settings, ChevronDown, Users, Shield } from "lucide-react";
import { CogniBaseLogo } from "./CogniBaseLogo";

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("user");
  const [userRole, setUserRole] = useState("member");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.username) setUsername(d.username);
      if (d.role)     setUserRole(d.role);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const logout = async () => {
    setMenuOpen(false);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.replace("/login"); }
  };

  const navLink = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`relative text-sm font-medium transition-colors pb-0.5 ${
          active ? "text-cyan-600" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {label}
        {active && (
          <span className="absolute -bottom-[14px] left-0 right-0 h-0.5 rounded-full logo-gradient-bg" />
        )}
      </Link>
    );
  };

  return (
    <div className="px-6 pb-0 flex justify-center">
      <nav className="w-full max-w-6xl bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm px-6 py-3.5 flex items-center justify-between"
        style={{ boxShadow: "0 1px 3px rgba(6,182,212,0.08), 0 1px 2px rgba(99,102,241,0.06)" }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
          <CogniBaseLogo height={34} variant="light" />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          {navLink("/dashboard", "My Knowledge Bases")}
          {navLink("/compare",   "Contract Compare")}
          {navLink("/features",  "Features")}
          {navLink("/support",   "Support")}
        </div>

        {/* User menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm logo-gradient-bg">
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 font-medium">{username}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden"
              style={{ boxShadow: "0 8px 24px rgba(6,182,212,0.1), 0 2px 8px rgba(99,102,241,0.08)" }}
            >
              <Link href="/settings" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                <Settings size={14} /> Settings
              </Link>
              <Link href="/team" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                <Users size={14} /> Teams
              </Link>
              {userRole === "admin" && (
                <Link href="/admin" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                  <Shield size={14} /> Admin Panel
                </Link>
              )}
              <div className="border-t border-slate-100 my-1" />
              <button onClick={logout}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
