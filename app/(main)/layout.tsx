import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-4">
        <Navbar />
      </div>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
