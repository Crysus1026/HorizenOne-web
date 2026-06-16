"use client";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setIsCheckingAuth(false);
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.data()?.role;

    if (role === "Technician") {
      router.push("/technician");
    } else if (role === "System Admin" || userDoc.data()?.isSystemAdmin === true) {
      router.push("/system-admin");
    } else {
      router.push("/dashboard");
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
    <main className="relative flex min-h-screen items-center justify-center bg-black px-8 text-white">
      <div className="-mt-24 flex max-w-4xl flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="HorizenOne Logo"
          width={900}
          height={900}
          priority
          className="mb-0 h-auto"
        />

        <p className="-mt-18 max-w-2xl text-lg text-slate-400">
          Manage customers, work orders, dispatching, scheduling, and technician
          completion in a single modern platform built for service organizations.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-white hover:bg-cyan-400"
          >
            Login
          </Link>

          <button
            type="button"
            onClick={() => setShowContactForm(true)}
            className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            Learn More
          </button>
        </div>
      </div>

      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Learn More</h2>
              <p className="mt-2 text-sm text-slate-400">
                Tell us a little about your organization and we&apos;ll reach out
                with more information about HorizenOne.
              </p>
            </div>

            <form className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <input
                type="text"
                placeholder="Company"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <input
                type="tel"
                placeholder="Phone"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <textarea
                rows={4}
                placeholder="Tell us about your business..."
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-400"
                >
                  Submit
                </button>

                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-300 hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}