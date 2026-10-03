"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import { formatKsh } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export default function WalletPage() {
  const router = useRouter();
  const {
    isLoggedIn,
    loading,
    balance,
    withdrawalMinimum,
    isPremium,
    requestWithdrawal,
  } = useAuth();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestWithdrawal(value);
      setMessage(result);
      // Only clear the field when the request actually landed.
      if (result.includes("requested.")) setAmount("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="gradient-brand rounded-3xl p-6 text-white shadow-lg">
          <p className="text-sm text-white/85">Available balance</p>
          <p className="mt-1 text-4xl font-extrabold">{formatKsh(balance)}</p>
          <p className="mt-2 text-xs text-white/80">
            {isPremium ? "Premium payout" : "Standard payout"} minimum:{" "}
            {formatKsh(withdrawalMinimum, 0)}
          </p>
        </div>

        <AdBanner unit="medium" className="mt-5" />

        <div className="mt-6 rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-extrabold text-slate-900">Request a payout</h2>
          <p className="mt-1 text-xs text-slate-500">
            Funds are sent to the M-Pesa number on your account after manual
            approval.
          </p>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder={`Amount (min ${withdrawalMinimum})`}
            className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
          />
          <div className="mt-3">
            <GradientButton onClick={submit} busy={busy}>
              Request withdrawal
            </GradientButton>
          </div>
          {message && (
            <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/account")}
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-700"
        >
          Account settings
        </button>
      </main>
    </div>
  );
}
