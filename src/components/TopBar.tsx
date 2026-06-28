"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const initial = auth.currentUser?.email?.charAt(0).toUpperCase() || "U";

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  function getPageTitle(path: string) {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",

      "/customers": "Customers",
      "/customers/new": "New Customer",

      "/work-orders": "Work Orders",
      "/work-orders/new": "New Work Order",

      "/dispatch": "Dispatch Board",
      "/calendar": "Calendar",
      "/inventory": "Inventory",

      "/admin": "Administration",
      "/admin/technicians": "Technicians",
      "/admin/service-types": "Service Types",

      "/system-admin": "System Administration",
      "/system-admin/companies": "Companies",
      "/system-admin/users": "Users",
      "/system-admin/projects": "Projects",
      "/system-admin/inventory-items": "Inventory Items",

      "/profile": "Profile",
    };

    return titles[path] || "HorizenOne";
  }

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-28 border-b border-cyan-500 bg-black px-6">
      <div className="flex h-full items-center justify-between">
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

        <div className="text-3xl font-bold text-blue-500">{pageTitle}</div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-cyan-500/40 hover:border-cyan-400"
          >
            <Image
              src="/profile-placeholder.png"
              alt="Profile"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </button>

          {isProfileMenuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  router.push("/profile");
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Profile
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}