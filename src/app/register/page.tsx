"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GradientButton } from "@/components/GradientButton";
import { premiumMinWithdrawal, premiumPrice, signupBonus } from "@/lib/config";
import {
  isValidPin,
  kenyanNetwork,
  normalizeKenyanPhone,
} from "@/lib/format";
import { markOnboarded } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";

type Plan = "free" | "premium";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<"plan" | "form">("plan");
  const [plan, setPlan] = useState<Plan>("free");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pin: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Digits only for the PIN fields, so stray characters can't sneak in.
  const setPin = (key: "pin" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value.replace(/\D/g, "").slice(0, 4) }));

  const network = kenyanNetwork(normalizeKenyanPhone(form.phone) ?? "");

  function continueAsGuest() {
    markOnboarded();
    router.push("/");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (form.name.trim().length < 2) return setError("Enter your name.");
    const phone = normalizeKenyanPhone(form.phone);
    if (!phone) {
      return setError("Enter a valid phone number, e.g. 0712 345 678.");
    }
    if (!kenyanNetwork(phone)) {
      return setError(
        "That line can't be charged by M-Pesa. Enter a Safaricom (07XX / 01XX) or Airtel Money (073X / 078X) number.",
      );
    }
    if (!isValidPin(form.pin)) {
      return setError("Your PIN must be exactly 4 digits.");
    }
    if (form.pin !== form.confirm) {
      return setError("PINs do not match.");
    }

    setBusy(true);
    try {
      const { needsConfirmation } = await register({
        name: form.name.trim(),
        phone,
        pin: form.pin,
      });
      markOnboarded();
      if (needsConfirmation) {
        setNotice(
          "Account created, but Supabase is asking for email confirmation. " +
            "The project owner must turn OFF \"Confirm email\" in Supabase → Authentication → Providers → Email, then you can sign in.",
        );
      } else {
        // Premium players go straight to payment; free players to the home grid.
        router.push(plan === "premium" ? "/premium" : "/");
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

      {step === "plan" ? (
        <div className="mx-auto -mt-10 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow">
          <h2 className="text-lg font-extrabold text-slate-900">
            Choose how you want to play
          </h2>
          <p className="text-sm text-slate-500">
            You can change this later — start free, or go Premium now.
          </p>

          <button
            type="button"
            onClick={() => setPlan("free")}
            className={`w-full rounded-2xl border-2 p-4 text-left transition ${
              plan === "free" ? "border-brand bg-emerald-50" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-slate-900">Free</p>
              {plan === "free" && <span className="text-brand">✓</span>}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>💰 Earn KSh 10 per correct answer</li>
              <li>📅 Up to 70 questions a day</li>
              <li>🏦 Withdraw from KSh 5,000</li>
              <li>📣 Ad-supported</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => setPlan("premium")}
            className={`w-full rounded-2xl border-2 p-4 text-left transition ${
              plan === "premium"
                ? "border-purple-500 bg-purple-50"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-slate-900">Premium</p>
              <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
                KSh {premiumPrice.toFixed(0)}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>♾️ Unlimited questions — no daily cap</li>
              <li>🚫 No ads</li>
              <li>🏦 Withdraw from KSh {premiumMinWithdrawal}</li>
              <li>🤝 Bigger referral rewards</li>
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              Paid once via M-Pesa, right after you create your account.
            </p>
          </button>

          <GradientButton onClick={() => setStep("form")}>
            {plan === "premium"
              ? "Continue with Premium"
              : "Continue with Free"}
          </GradientButton>
          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Just browsing? Continue as guest
          </button>
        </div>
      ) : (
      <form
        onSubmit={submit}
        className="mx-auto -mt-10 max-w-md space-y-4 rounded-3xl bg-white p-6 card-shadow"
      >
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">Selected plan</p>
            <p className="font-extrabold text-slate-900">
              {plan === "premium"
                ? `Premium — KSh ${premiumPrice.toFixed(0)}`
                : "Free"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="text-xs font-bold text-brand underline"
          >
            Change
          </button>
        </div>

        <input
          value={form.name}
          onChange={set("name")}
          placeholder="Full name"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
        />
        <div>
          <input
            value={form.phone}
            onChange={set("phone")}
            inputMode="tel"
            autoComplete="tel"
            placeholder="M-Pesa phone number, e.g. 0712 345 678"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
          />
          <p className="mt-1.5 px-1 text-xs text-slate-500">
            {network ? (
              <span className="font-semibold text-brand">
                ✓ {network} number — we&apos;ll pay you here
              </span>
            ) : (
              <>
                <strong>Safaricom M-Pesa</strong> (07XX / 01XX) or{" "}
                <strong>Airtel Money</strong> (073X / 078X) numbers only. This
                is your username too — you&apos;ll sign in with it.
              </>
            )}
          </p>
        </div>
        <div>
          <input
            value={form.pin}
            onChange={setPin("pin")}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Choose a 4-digit PIN"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 tracking-[0.5em] outline-none focus:border-brand"
          />
          <p className="mt-1.5 px-1 text-xs text-slate-500">
            Your PIN is your password — you&apos;ll use it to sign in.
          </p>
        </div>
        <input
          value={form.confirm}
          onChange={setPin("confirm")}
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Confirm your PIN"
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 tracking-[0.5em] outline-none focus:border-brand"
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
          {plan === "premium" ? "Create account & continue" : "Create account"}
        </GradientButton>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand">
            Log in
          </Link>
        </p>
      </form>
      )}
    </div>
  );
}
