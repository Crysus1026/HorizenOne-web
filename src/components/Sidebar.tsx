"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Dispatch Board", href: "/dispatch" },
  { label: "Calendar", href: "/calendar" },
  { label: "Work Orders", href: "/work-orders" },
  { label: "Customers", href: "/customers" },
  { label: "Admin", href: "/admin" },
  { label: "Fleet (Coming Soon)", href: "#!" },
  { label: "Inventory (BETA)", href: "/inventory" },
  { label: "Quotes/Invoices (Coming Soon)", href: "$" },
];

export default function Sidebar() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-cyan-400 bg-black p-4">
      <div className="mb-8 flex flex-col items-center">
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-sky-500 hover:text-black"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-sky-500 hover:text-black"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}