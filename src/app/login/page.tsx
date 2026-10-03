"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GradientButton } from "@/components/GradientButton";
import { isValidPin, normalizeKenyanPhone } from "@/lib/format";
import { markOnboarded } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      setError("Enter the phone number you registered with, e.g. 0712 345 678.");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Your PIN is 4 digits.");
      return;
    }
    setBusy(true);
    try {
      await login(normalized, pin);
      markOnboarded();
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
          Sign in with your phone number and PIN
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mx-auto -mt-10 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow"
      >
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number, e.g. 0712 345 678"
          inputMode="tel"
          autoComplete="tel"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          type="password"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder="4-digit PIN"
          inputMode="numeric"
          maxLength={4}
          autoComplete="current-password"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 tracking-[0.5em] outline-none focus:border-brand"
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
        <button
          type="button"
          onClick={() => {
            markOnboarded();
            router.push("/");
          }}
          className="w-full text-center text-xs text-slate-400"
        >
          Continue as guest
        </button>
      </form>
    </div>
  );
}
