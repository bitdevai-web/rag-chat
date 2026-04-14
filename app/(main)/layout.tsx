import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50/50 via-blue-50/40 to-indigo-50/30 flex flex-col relative overflow-hidden">
      {/* Cyan accent circle - logo color */}
      <div className="absolute top-0 -right-48 w-96 h-96 bg-gradient-to-br from-cyan-200/15 to-cyan-100/5 rounded-full blur-3xl -z-10" />
      
      {/* Indigo accent circle - logo color */}
      <div className="absolute -bottom-32 -left-48 w-80 h-80 bg-gradient-to-tr from-indigo-200/15 to-indigo-100/5 rounded-full blur-3xl -z-10" />
      
      {/* Blue accent - logo color */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-100/10 to-cyan-100/5 rounded-full blur-3xl -z-10" />
      
      <div className="pt-4 relative z-30">
        <Navbar />
      </div>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 relative z-10">{children}</main>
      <footer className="text-center text-xs text-gray-500 py-5 relative z-10">
        © 2026 CogniBase. All rights reserved.
      </footer>
    </div>
  );
}
