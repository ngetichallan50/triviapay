"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { premiumMinWithdrawal, premiumPrice } from "@/lib/config";
import { useAuth } from "@/providers/AuthProvider";

/// Shows a Premium upsell pop-up to signed-in free players at random times.
///
/// The first nudge comes 45–90s after they become eligible, then every 3–7
/// minutes after each dismissal, up to a few times per visit. It never shows to
/// Premium members or guests, and it stays out of the way on `/premium` (the
/// page you'd send them to) and `/quiz` (a timed round shouldn't be interrupted
/// — the daily-limit prompt covers that screen instead).

const MAX_NUDGES = 4;

const randomBetween = (minMs: number, maxMs: number) =>
  minMs + Math.random() * (maxMs - minMs);

export function PremiumNudge() {
  const { loading, isLoggedIn, isPremium } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);

  const eligible =
    !loading &&
    isLoggedIn &&
    !isPremium &&
    pathname !== "/premium" &&
    pathname !== "/quiz" &&
    shown < MAX_NUDGES;

  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return;
    }
    const delay =
      shown === 0
        ? randomBetween(45_000, 90_000)
        : randomBetween(180_000, 420_000);
    const timer = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(timer);
  }, [eligible, shown]);

  if (!open || !eligible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-fade-in w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
          style={{ backgroundImage: "linear-gradient(135deg,#6D28D9,#9333EA)" }}
        >
          👑
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-slate-900">
          Play more, earn more
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Go Premium for{" "}
          <strong className="text-slate-700">
            KSh {premiumPrice.toFixed(0)}
          </strong>{" "}
          and unlock:
        </p>
        <ul className="mt-3 space-y-1.5 text-left text-sm text-slate-600">
          <li>♾️ Unlimited questions — no daily cap</li>
          <li>🚫 No ads</li>
          <li>🏦 Withdraw from KSh {premiumMinWithdrawal}</li>
        </ul>
        <div className="mt-5 space-y-2">
          <Link
            href="/premium"
            onClick={() => setOpen(false)}
            className="block w-full rounded-2xl px-4 py-3 font-bold text-white"
            style={{ backgroundImage: "linear-gradient(135deg,#6D28D9,#9333EA)" }}
          >
            Go Premium
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShown((count) => count + 1);
            }}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
