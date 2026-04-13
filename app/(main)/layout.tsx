import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 antialiased">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
