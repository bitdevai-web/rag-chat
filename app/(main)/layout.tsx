import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="pt-4">
        <Navbar />
      </div>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="text-center text-xs text-gray-400 py-5">
        © 2026 Brainium Information Technologies Pvt Ltd
      </footer>
    </div>
  );
}
