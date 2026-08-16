"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canPerformFieldWork } from "@/features/users/utils/userProfilePermissions";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Dispatch Board", href: "/dispatch" },
  { label: "Calendar", href: "/calendar" },
  { label: "Work Orders", href: "/work-orders" },
  { label: "Customers", href: "/customers" },
];

const inventoryNavItems = [
  { label: "Overview", href: "/inventory" },
  { label: "Items", href: "/inventory/items" },
  { label: "Technician Inventory", href: "/inventory/technicians" },
  { label: "Warehouses", href: "/inventory/warehouses" },
  { label: "Reconciliation", href: "/inventory/reconciliation" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { profile } = useUserProfile();

  const hasFieldWorkAccess =
    canPerformFieldWork(profile);

  const isInventoryRoute = pathname.startsWith("/inventory");

  const [inventoryOpen, setInventoryOpen] = useState(isInventoryRoute);

  useEffect(() => {
    if (isInventoryRoute) {
      setInventoryOpen(true);
    }
  }, [isInventoryRoute]);

  function isActiveRoute(href: string) {
    if (href === "/inventory") {
      return pathname === "/inventory";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 p-4">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const active = isActiveRoute(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 text-sm transition ${
                active
                  ? "bg-sky-500 font-medium text-black"
                  : "text-slate-300 hover:bg-sky-500 hover:text-black"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {hasFieldWorkAccess && (
          <Link
            href="/technician"
            className={`block rounded-lg px-4 py-3 text-sm transition ${
              isActiveRoute("/technician")
                ? "bg-sky-500 font-medium text-black"
                : "text-slate-300 hover:bg-sky-500 hover:text-black"
            }`}
          >
            My Field Work
          </Link>
        )}

        <div>
          <button
            type="button"
            onClick={() => setInventoryOpen((current) => !current)}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition ${
              isInventoryRoute
                ? "bg-slate-800 font-medium text-sky-400"
                : "text-slate-300 hover:bg-sky-500 hover:text-black"
            }`}
          >
            <span>Inventory</span>

            <span className="text-xs">
              {inventoryOpen ? "▲" : "▼"}
            </span>
          </button>

          {inventoryOpen && (
            <div className="mt-1 space-y-1 pl-4">
              {inventoryNavItems.map((item) => {
                const active = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-4 py-2 text-sm transition ${
                      active
                        ? "bg-sky-500 font-medium text-black"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href="/reports"
          className={`block rounded-lg px-4 py-3 text-sm transition ${
            isActiveRoute("/reports")
              ? "bg-sky-500 font-medium text-black"
              : "text-slate-300 hover:bg-sky-500 hover:text-black"
          }`}
        >
          Reports
        </Link>

        <Link
          href="/admin"
          className={`block rounded-lg px-4 py-3 text-sm transition ${
            isActiveRoute("/admin")
              ? "bg-sky-500 font-medium text-black"
              : "text-slate-300 hover:bg-sky-500 hover:text-black"
          }`}
        >
          Admin
        </Link>

        <div className="pt-3">
          <div className="border-t border-slate-800 pt-3">
            <div className="rounded-lg px-4 py-3 text-sm text-slate-600">
              Fleet
              <span className="ml-2 text-xs">Coming Soon</span>
            </div>

            <div className="rounded-lg px-4 py-3 text-sm text-slate-600">
              Quotes / Invoices
              <span className="ml-2 text-xs">Coming Soon</span>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}