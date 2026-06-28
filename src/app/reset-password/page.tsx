"use client";

import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setIsSending(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);

      setMessage(
        "If an account exists for this email, a password reset link has been sent."
      );
      setEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Unable to send reset email. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-zinc-950 p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold">Reset Password</h1>

        <p className="mb-6 text-sm text-zinc-400">
          Enter your email address and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {message ? <p className="text-sm text-green-400">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

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