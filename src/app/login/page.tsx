"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GradientButton } from "@/components/GradientButton";
import { isValidPassword } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="gradient-brand rounded-b-[36px] px-6 pb-16 pt-12 text-center text-white">
        <div className="text-5xl">💰</div>
        <h1 className="mt-3 text-2xl font-extrabold">Welcome back!</h1>
        <p className="mt-1 text-sm text-white/90">
          Sign in to keep earning on M-Pesa
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mx-auto -mt-10 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          autoComplete="email"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <GradientButton type="submit" busy={busy}>
          Sign in
        </GradientButton>
        <p className="text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/register" className="font-bold text-brand">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-slate-400">
          <Link href="/">Continue as guest</Link>
        </p>
      </form>
    </div>
  );
}
