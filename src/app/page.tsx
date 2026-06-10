"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between border-b border-slate-800 px-8 py-5">
        <div>
          <h1 className="text-xl font-bold">HorizenOne</h1>
          <p className="text-sm text-slate-500">Operations Platform</p>
        </div>

        <Link
          href="/login"
          className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
        >
          Login
        </Link>
      </nav>

      <section className="flex min-h-[calc(100vh-81px)] items-center px-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Work Order Management
          </p>

          <h2 className="text-5xl font-bold tracking-tight">
            Manage customers, work orders, dispatch, and field completion in one
            platform.
          </h2>

          <p className="mt-6 max-w-2xl text-lg text-slate-400">
            HorizenOne is a modern operations platform built for service teams
            that need a faster way to schedule work, assign technicians, and
            track job completion.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
            >
              Login
            </Link>

            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}