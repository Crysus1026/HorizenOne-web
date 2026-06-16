"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const initial =
    auth.currentUser?.email?.charAt(0).toUpperCase() || "U";

  function getPageTitle(path: string) {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",

      "/customers": "Customers",
      "/customers/new": "New Customer",

      "/work-orders": "Work Orders",
      "/work-orders/new": "New Work Order",

      "/dispatch": "Dispatch Board",
      "/calendar": "Calendar",

      "/admin": "Administration",
      "/admin/technicians": "Technicians",
      "/admin/service-types": "Service Types",

      "/system-admin": "System Administration",
      "/system-admin/companies": "Companies",
      "/system-admin/users": "Users",
      "/system-admin/projects": "Projects",

      "/profile": "Profile",
    };

    return titles[path] || "HorizenOne";
  }

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-28 border-b border-cyan-500 bg-black px-6">
      <div className="flex h-full items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="HorizenOne"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
        </div>

        {/* Page Title */}
        <div className="text-3xl font-bold text-blue-500">
          {pageTitle}
        </div>

        {/* Profile Button */}
        <button
          onClick={() => router.push("/profile")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-black transition hover:bg-cyan-400"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}