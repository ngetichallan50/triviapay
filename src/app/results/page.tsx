"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import { kshPerCorrect } from "@/lib/config";
import { formatKsh } from "@/lib/format";
import type { QuizSummary } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

export default function ResultsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [summary, setSummary] = useState<QuizSummary | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("tpweb_summary");
    if (raw) {
      try {
        setSummary(JSON.parse(raw) as QuizSummary);
      } catch {
        setSummary(null);
      }
    }
  }, []);

  if (!summary) {
    return (
      <div>
        <AppHeader />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="text-slate-500">No results yet.</p>
          <div className="mt-6">
            <GradientButton onClick={() => router.push("/")}>
              Back home
            </GradientButton>
          </div>
        </div>
      </div>
    );
  }

  const pct = summary.total > 0 ? Math.round((summary.score / summary.total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-3xl bg-white p-6 text-center card-shadow">
          <div className="text-5xl">{pct >= 70 ? "🏆" : "🎉"}</div>
          <h1 className="mt-2 text-xl font-extrabold text-slate-900">
            {summary.guest ? "Round complete!" : "Winnings added!"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            You scored {summary.score} of {summary.total} ({pct}%)
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Earned</p>
              <p className="text-lg font-extrabold text-emerald-700">
                {formatKsh(summary.earned, 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Balance</p>
              <p className="text-lg font-extrabold text-slate-900">
                {formatKsh(summary.balance)}
              </p>
            </div>
          </div>

          {summary.guest && !isLoggedIn && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              You played as a guest.{" "}
              <Link href="/register" className="font-bold underline">
                Create a free account
              </Link>{" "}
              to earn KSh {kshPerCorrect.toFixed(0)} for every correct answer
              — plus a KSh 500 welcome bonus.
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <GradientButton onClick={() => router.push("/")}>
            Play again
          </GradientButton>
          {!summary.guest && (
            <button
              type="button"
              onClick={() => router.push("/wallet")}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-700"
            >
              View wallet
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
