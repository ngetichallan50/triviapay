"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GradientButton } from "@/components/GradientButton";
import { signupBonus } from "@/lib/config";
import {
  isValidPassword,
  isValidUsername,
  normalizeKenyanPhone,
} from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (form.name.trim().length < 2) return setError("Enter your name.");
    if (!isValidUsername(form.username.trim())) {
      return setError(
        "Username: 3-15 chars, start with a letter (letters, numbers, _).",
      );
    }
    if (!form.email.includes("@")) return setError("Enter a valid email.");
    const phone = normalizeKenyanPhone(form.phone);
    if (!phone) return setError("Enter a valid phone number, e.g. 0712345678");
    if (!isValidPassword(form.password)) {
      return setError("Password must be at least 6 characters.");
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }

    setBusy(true);
    try {
      const { needsConfirmation } = await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        username: form.username.trim(),
        phone,
      });
      if (needsConfirmation) {
        setNotice(
          "Account created! Check your email to confirm it, then sign in. " +
            "Tip: the project owner can turn email confirmation off in Supabase.",
        );
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="gradient-brand rounded-b-[36px] px-6 pb-16 pt-12 text-center text-white">
        <div className="text-5xl">🚀</div>
        <h1 className="mt-3 text-2xl font-extrabold">Join TriviaPay</h1>
        <p className="mt-1 text-sm text-white/90">
          Earn KSh for every correct answer, paid to your M-Pesa.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mx-auto -mt-10 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow"
      >
        <input
          value={form.name}
          onChange={set("name")}
          placeholder="Full name"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          value={form.username}
          onChange={set("username")}
          placeholder="Username (for referrals)"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          value={form.email}
          onChange={set("email")}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          value={form.phone}
          onChange={set("phone")}
          inputMode="tel"
          placeholder="Phone number (M-Pesa / Airtel Money)"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          value={form.password}
          onChange={set("password")}
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          value={form.confirm}
          onChange={set("confirm")}
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          🎁 Get KSh {signupBonus.toFixed(0)} welcome bonus when you create your
          account!
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        <GradientButton type="submit" busy={busy}>
          Create account
        </GradientButton>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
