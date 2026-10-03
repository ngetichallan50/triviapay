"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import {
  premiumMinWithdrawal,
  premiumPrice,
  referralBonus,
  referralBonusPremium,
} from "@/lib/config";
import {
  formatPhonePretty,
  kenyanNetwork,
  normalizeKenyanPhone,
} from "@/lib/format";
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

type PayPhase = "idle" | "sending" | "waiting" | "success" | "failed";

export default function PremiumPage() {
  const router = useRouter();
  const { isLoggedIn, isPremium, profile, session, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<PayPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTxn, setPendingTxn] = useState<string | null>(null);

  // Prefilled with the number they registered with — editable for this payment.
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneEdited, setPhoneEdited] = useState(false);

  const busy = phase === "sending" || phase === "waiting";
  const entered = normalizeKenyanPhone(phoneInput);
  const enteredNetwork = entered ? kenyanNetwork(entered) : null;
  const enteredPhone = enteredNetwork ? entered : null;

  useEffect(() => {
    if (phoneEdited) return;
    setPhoneInput(profile?.phone ? formatPhonePretty(profile.phone) : "");
  }, [profile?.phone, phoneEdited]);

  /**
   * Asks the server to switch Premium on. The server re-checks the payment with
   * Paywave and owns the write — the browser can't activate itself.
   */
  async function activateConfirmed(txnId: string, receipt?: string) {
    setPhase("success");
    setMessage(
      `Payment received${receipt ? ` (receipt ${receipt})` : ""}. Activating Premium…`,
    );
    try {
      const res = await fetch("/api/pay/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not activate Premium.");
      }
      await refreshProfile();
      const usedReceipt = (data.receipt as string | undefined) ?? receipt;
      setMessage(
        `Premium activated 👑${usedReceipt ? ` Receipt ${usedReceipt}` : ""}`,
      );
    } catch (error) {
      setPhase("failed");
      setMessage(
        `Payment succeeded but activating Premium failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  /** Polls Paywave until the payment settles or we run out of attempts. */
  async function poll(token: string, txnId: string, attempts: number) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const res = await fetch(
        `/api/pay/status?txn_id=${encodeURIComponent(txnId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));
      const status = data.status as string | undefined;

      if (status === "Completed") {
        setPendingTxn(null);
        await activateConfirmed(txnId, data.receipt as string | undefined);
        return;
      }
      if (status === "Failed" || status === "Cancelled") {
        setPendingTxn(null);
        setPhase("failed");
        setMessage(
          status === "Cancelled"
            ? "You cancelled the M-Pesa prompt. You have not been charged."
            : "Payment failed — you have not been charged.",
        );
        return;
      }
      // Pending / unknown → keep waiting. Never treat it as a failure.
    }
    setPhase("idle");
    setMessage("Still waiting for M-Pesa. Tap “Check status” to keep checking.");
  }

  async function pay() {
    if (!isLoggedIn || !session) {
      router.push("/login");
      return;
    }
    if (!enterPhone()) return;
    const token = session.access_token;
    setMessage(null);
    setPhase("sending");
    try {
      const res = await fetch("/api/pay/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: enteredPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPhase("failed");
        setMessage(data.error ?? "Could not send the M-Pesa prompt.");
        return;
      }
      const txnId = data.transactionRequestId as string;
      setPendingTxn(txnId);
      setPhase("waiting");
      setMessage(
        data.message ??
          "Check your phone for the M-Pesa prompt and enter your PIN.",
      );
      await poll(token, txnId, 20);
    } catch {
      setPhase("failed");
      setMessage("Something went wrong. Please try again.");
    }
  }

  /** Validates the typed number, surfacing a message when it can't be used. */
  function enterPhone(): boolean {
    if (!phoneInput.trim()) {
      setPhase("failed");
      setMessage("Enter the M-Pesa number to charge.");
      return false;
    }
    if (!entered) {
      setPhase("failed");
      setMessage("Enter a valid phone number, e.g. 0712 345 678.");
      return false;
    }
    if (!enteredNetwork) {
      setPhase("failed");
      setMessage(
        "Use a Safaricom M-Pesa (07XX / 01XX) or Airtel Money (073X / 078X) number.",
      );
      return false;
    }
    return true;
  }

  async function checkAgain() {
    if (!session || !pendingTxn) return;
    setPhase("waiting");
    setMessage("Checking with M-Pesa…");
    await poll(session.access_token, pendingTxn, 5);
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
          ) : !isLoggedIn ? (
            <>
              <p className="text-sm text-slate-600">
                Sign in to pay with M-Pesa and unlock Premium on your account.
              </p>
              <GradientButton
                onClick={() => router.push("/login")}
                gradient={GRADIENT}
              >
                Sign in to continue
              </GradientButton>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-50 p-3">
                <label
                  htmlFor="mpesa-number"
                  className="text-xs font-bold text-slate-500"
                >
                  M-Pesa number to charge
                </label>
                <input
                  id="mpesa-number"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneEdited(true);
                    setPhoneInput(e.target.value);
                  }}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 0712 345 678"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
                {enteredNetwork ? (
                  <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                    ✓ {enteredNetwork} — KSh {premiumPrice} will be requested
                    from this number
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Safaricom M-Pesa (07XX / 01XX) or Airtel Money (073X / 078X).
                    This is only for this payment — your payout number lives in{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => router.push("/account")}
                    >
                      Account
                    </button>
                    .
                  </p>
                )}
              </div>
              <GradientButton
                onClick={pendingTxn && phase !== "success" ? checkAgain : pay}
                busy={busy}
                gradient={GRADIENT}
              >
                {busy
                  ? phase === "sending"
                    ? "Sending M-Pesa prompt…"
                    : "Waiting for M-Pesa…"
                  : pendingTxn && phase !== "success"
                    ? "Check status"
                    : `Pay KSh ${premiumPrice} with M-Pesa`}
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
          Payments are collected through an M-Pesa STK push (PayWave). You are
          only charged after you enter your M-Pesa PIN, and Premium activates
          only once the payment is confirmed.
        </p>
      </main>
    </div>
  );
}
