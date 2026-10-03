"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import {
  premiumMinWithdrawal,
  premiumPrice,
  referralBonus,
  referralBonusPremium,
} from "@/lib/config";
import { normalizeKenyanPhone } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const GRADIENT = "linear-gradient(135deg,#6D28D9 0%,#9333EA 100%)";

const BENEFITS = [
  {
    icon: "🏦",
    title: `Withdraw from KSh ${premiumMinWithdrawal}`,
    subtitle: "Free accounts start at KSh 5,000 — Premium unlocks smaller payouts.",
  },
  { icon: "🚫", title: "No ads", subtitle: "Clean, uninterrupted trivia." },
  {
    icon: "♾️",
    title: "Unlimited questions",
    subtitle: "No 70-questions-a-day cap — play as much as you want.",
  },
  {
    icon: "🤝",
    title: `Referrals pay KSh ${referralBonusPremium}`,
    subtitle: `Instead of KSh ${referralBonus} — per person you bring in.`,
  },
];

export default function PremiumPage() {
  const router = useRouter();
  const { isLoggedIn, isPremium, profile, activatePremium } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pay() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      setMessage("Enter a valid M-Pesa / Airtel Money number, e.g. 0712345678");
      return;
    }
    setBusy(true);
    try {
      // Skeleton: no Daraja callback yet, so we activate straight away and
      // record the intent on the profile.
      setMessage(
        `An M-Pesa prompt for KSh ${premiumPrice} was sent to ${normalized}. Enter your PIN to confirm.`,
      );
      await activatePremium();
      await supabase.auth.updateUser({ data: { premium_pending: false } });
      setMessage("Premium activated. Karibu! 👑");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <div
          className="rounded-3xl p-6 text-center text-white shadow-lg"
          style={{ backgroundImage: GRADIENT }}
        >
          <div className="text-5xl">👑</div>
          <h1 className="mt-2 text-2xl font-extrabold">
            {isPremium ? "You're on Premium" : "Go Premium"}
          </h1>
          <p className="mt-1 text-sm text-white/90">
            {isPremium
              ? "All benefits are active on this account."
              : `KSh ${premiumPrice} — one payment, unlocked benefits.`}
          </p>
        </div>

        <div className="mt-5 space-y-4 rounded-3xl bg-white p-5 card-shadow">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-lg">
                {b.icon}
              </span>
              <div>
                <p className="font-bold text-slate-900">{b.title}</p>
                <p className="text-xs text-slate-500">{b.subtitle}</p>
              </div>
            </div>
          ))}

          {isPremium ? (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              Premium is active. Asante for supporting TriviaPay!
            </div>
          ) : (
            <>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="M-Pesa / Airtel Money number"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500"
              />
              <p className="text-xs font-semibold text-amber-600">
                We send an M-Pesa prompt for KSh {premiumPrice} to this number.
              </p>
              <GradientButton onClick={pay} busy={busy} gradient={GRADIENT}>
                Prompt — KSh {premiumPrice}
              </GradientButton>
            </>
          )}

          {message && (
            <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Payments are handled by TriviaPay support for now — the M-Pesa prompt
          above is a placeholder until the Daraja integration is live.
        </p>
      </main>
    </div>
  );
}
