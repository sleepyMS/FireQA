import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <Header />
        <main className="min-w-0 flex-1 overflow-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
