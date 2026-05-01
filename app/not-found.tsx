import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 flex items-center justify-center mx-auto mb-5">
          <SearchX size={24} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <Home size={15} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
