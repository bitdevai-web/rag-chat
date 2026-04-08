"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, FolderOpen, Settings, Bot, LogOut } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/chat",      label: "Chat",      icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FolderOpen    },
  { href: "/settings",  label: "Settings",  icon: Settings      },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">RAG Chat</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <LogOut size={17} />
          {loggingOut ? "Signing out…" : "Sign Out"}
        </button>
        <p className="text-xs text-gray-400 px-3 pt-1">RAG Chat v1.0</p>
      </div>
    </aside>
  );
}
