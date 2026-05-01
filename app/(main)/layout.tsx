import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Subtle logo-colour accent blobs behind everything */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />
      </div>

      <div className="pt-4">
        <Navbar />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      <footer className="text-center text-xs text-slate-400 py-5 border-t border-slate-200/60">
        © 2026 Brainium Information Technologies Pvt Ltd
      </footer>
    </div>
  );
}
