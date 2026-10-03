"use client";

import Link from "next/link";
import { formatKsh } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export function AppHeader() {
  const { isLoggedIn, balance, isPremium, loading } = useAuth();

  return (
    <header className="gradient-brand sticky top-0 z-30 text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          TriviaPay
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {loading ? null : isLoggedIn ? (
            <>
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                {formatKsh(balance)}
              </span>
              <Link
                href="/premium"
                title={isPremium ? "Premium active" : "Go Premium"}
                className="rounded-full px-2 py-1 text-lg leading-none"
              >
                {isPremium ? "👑" : "▽"}
              </Link>
              <Link
                href="/wallet"
                title="Wallet"
                className="rounded-full px-2 py-1 text-lg leading-none"
              >
                💳
              </Link>
              <Link
                href="/account"
                title="Account"
                className="rounded-full px-2 py-1 text-lg leading-none"
              >
                👤
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
