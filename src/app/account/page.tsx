"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { AppHeader } from "@/components/AppHeader";
import { GradientButton } from "@/components/GradientButton";
import { formatKsh, formatPhonePretty, kenyanNetwork, normalizeKenyanPhone } from "@/lib/format";
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
    updatePhone,
  } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

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

  async function savePhone() {
    setMessage(null);
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      setMessage("Enter a valid phone number, e.g. 0712 345 678.");
      return;
    }
    if (!kenyanNetwork(normalized)) {
      setMessage(
        "Use a Safaricom M-Pesa (07XX / 01XX) or Airtel Money (073X / 078X) number.",
      );
      return;
    }
    setPhoneBusy(true);
    try {
      await updatePhone(normalized);
      setPhone(formatPhonePretty(normalized));
      setMessage("M-Pesa number updated. Payouts and payments now use it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update.");
    } finally {
      setPhoneBusy(false);
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
                {profile?.phone ? formatPhonePretty(profile.phone) : "No phone yet"}
              </p>
            </div>
            {isPremium && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                👑 Premium
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Your phone number is your username.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Balance</p>
              <p className="font-extrabold">{formatKsh(balance)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Sign-in</p>
              <p className="font-extrabold">Phone + PIN</p>
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

        <div className="mt-6 rounded-3xl bg-white p-5 card-shadow">
          <h2 className="font-extrabold text-slate-900">M-Pesa number</h2>
          <p className="mt-1 text-xs text-slate-500">
            Used for payouts and for Premium payments. Safaricom M-Pesa (07XX /
            01XX) or Airtel Money (073X / 078X) only.
          </p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 0712 345 678"
            className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand"
          />
          <div className="mt-3">
            <GradientButton onClick={savePhone} busy={phoneBusy}>
              Save number
            </GradientButton>
          </div>
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
