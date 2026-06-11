import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}