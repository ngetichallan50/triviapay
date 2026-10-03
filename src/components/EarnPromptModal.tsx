"use client";

import Link from "next/link";

type Props = {
  onPlayFree: () => void;
  onClose: () => void;
};

/** Shown to guests when they press Start: sign in to earn, or play free. */
export function EarnPromptModal({ onPlayFree, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-fade-in w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="gradient-brand mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl">
          💰
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-slate-900">
          Sign in to earn 💰
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Create a free account and earn real money on M-Pesa for every correct
          answer — plus a KSh 500 welcome bonus. Or keep playing for free —
          hakuna shida!
        </p>
        <div className="mt-5 space-y-2">
          <Link
            href="/register"
            className="block w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-800"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onPlayFree}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Play free
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-xs text-slate-400 underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}
