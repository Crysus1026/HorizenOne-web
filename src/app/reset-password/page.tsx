"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error(err);
      setError("Unable to send reset email. Please check the email address.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-zinc-950 p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Enter your email address and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-black border border-zinc-700 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black hover:bg-cyan-400 disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send Reset Email"}
          </button>
        </form>

        <div className="mt-6 text-sm">
          <Link href="/login" className="text-cyan-400 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}