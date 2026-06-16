"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userDoc = await getDoc(
        doc(db, "users", credential.user.uid)
      );

      const role = userDoc.data()?.role;

      if (!userDoc.exists()) {
        alert("User profile not found.");
        return;
      }

      if (role === "Technician") {
        router.push("/technician");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      alert("Login failed. Check your email and password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"
      >
        <h1 className="text-2xl font-bold">Sign in to HorizenOne</h1>

        <div className="mt-6">
          <label className="text-sm text-slate-300">Email</label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm text-slate-300">Password</label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>

        <button className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-400">
          Sign In
        </button>
        <div className="mt-3 text-right text-sm">
          <Link href="/reset-password" className="text-cyan-400 hover:underline">
            Forgot password?
          </Link>
        </div>
      </form>
    </main>
  );
}