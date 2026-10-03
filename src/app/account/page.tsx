"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import { formatKsh } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export default function AccountPage() {
  const router = useRouter();
  const {
    loading,
    isLoggedIn,
    profile,
    isPremium,
    balance,
    logout,
    updateName,
  } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  async function saveName() {
    if (name.trim().length < 2) {
      setMessage("Enter your name.");
      return;
    }
    setBusy(true);
    try {
      await updateName(name.trim());
      setMessage("Name updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-3xl bg-white p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              👤
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-slate-900">
                {profile?.name ?? "Player"}
              </p>
              <p className="text-sm text-slate-500">
                @{profile?.username ?? "username"}
              </p>
            </div>
            {isPremium && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                👑 Premium
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Balance</p>
              <p className="font-extrabold">{formatKsh(balance)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Phone</p>
              <p className="font-extrabold">{profile?.phone ?? "—"}</p>
            </div>
          </div>
        </div>

        <AdBanner unit="medium" className="mt-5" />

        <div className="mt-6 rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-extrabold text-slate-900">Edit name</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
          />
          <div className="mt-3">
            <GradientButton onClick={saveName} busy={busy}>
              Save
            </GradientButton>
          </div>
          {message && (
            <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>

        {!isPremium && (
          <button
            type="button"
            onClick={() => router.push("/premium")}
            className="mt-5 w-full rounded-2xl px-4 py-3 font-bold text-purple-700"
            style={{ backgroundImage: "linear-gradient(135deg,#EDE9FE,#F3E8FF)" }}
          >
            👑 Go Premium — unlimited questions
          </button>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mt-5 w-full rounded-2xl border border-red-200 px-4 py-3 font-bold text-red-600"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
