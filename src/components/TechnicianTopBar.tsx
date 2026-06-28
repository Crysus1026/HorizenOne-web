"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TechnicianTopBarProps = {
  title?: string;
  subtitle?: string;
};

export default function TechnicianTopBar({
  title = "Technician Portal",
  subtitle,
}: TechnicianTopBarProps) {
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 flex h-28 items-center justify-between border-b border-cyan-500 bg-black px-4">
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="HorizenOne"
          width={100}
          height={100}
          priority
          className="h-20 w-auto object-contain"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-semibold text-white">{title}</p>

          {subtitle && <p className="text-sm text-cyan-400">{subtitle}</p>}
        </div>

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
              <Link
                href="/technician/inventory"
                onClick={() => setIsProfileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                My Inventory
              </Link>

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