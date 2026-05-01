"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-16">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Home size={15} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
