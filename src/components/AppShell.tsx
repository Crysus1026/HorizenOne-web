"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "./TopBar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
  <div className="min-h-screen bg-black text-white">
    {/* Top Bar */}
    <TopBar />

    <div className="flex">
      {/* Mobile Hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed right-4 top-4 z-50 rounded-md border border-cyan-400 bg-black p-2 text-cyan-400 shadow-lg md:hidden"
      >
        ☰
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />

        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 rounded-md bg-slate-800 px-2 py-1 text-white"
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  </div>
);
}