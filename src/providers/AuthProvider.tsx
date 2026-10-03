"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { dailyQuestionLimit, minWithdrawalFor, signupBonus } from "@/lib/config";
import { authPasswordFor, phoneDigits, phoneToAuthEmail } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

/** Sign-up only needs a name, a phone number and a 4-digit PIN. */
export type RegisterInput = {
  name: string;
  phone: string;
  pin: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isLoggedIn: boolean;
  isPremium: boolean;
  balance: number;
  username: string | null;
  /** `null` = unlimited (premium). */
  dailyLimit: number | null;
  withdrawalMinimum: number;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addEarnings: (amount: number) => Promise<number>;
  requestWithdrawal: (amount: number) => Promise<string>;
  updateName: (name: string) => Promise<void>;
  updatePhone: (phone: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error) setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        void loadProfile(next.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const register = useCallback(
    async (input: RegisterInput) => {
      const username = phoneDigits(input.phone);
      const { data, error } = await supabase.auth.signUp({
        // The player only knows their phone + PIN; auth runs on a derived email.
        email: phoneToAuthEmail(input.phone),
        password: authPasswordFor(input.phone, input.pin),
        options: {
          data: {
            name: input.name,
            username,
            phone: input.phone,
          },
        },
      });
      if (error) throw new Error(error.message);

      // Only reached if email confirmation is enabled in Supabase — which must
      // stay OFF, since the address is synthetic and can't receive mail.
      if (!data.session || !data.user) return { needsConfirmation: true };

      // Make sure the profile carries the phone/username and welcome bonus,
      // even if the database trigger hasn't been updated yet.
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          name: input.name,
          username,
          phone: input.phone,
          balance: signupBonus,
        },
        { onConflict: "id" },
      );
      await loadProfile(data.user.id);
      return { needsConfirmation: false };
    },
    [loadProfile],
  );

  const login = useCallback(async (phone: string, pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(phone),
      password: authPasswordFor(phone, pin),
    });
    if (error) {
      throw new Error(
        /invalid login credentials/i.test(error.message)
          ? "Wrong phone number or PIN. Please try again."
          : error.message,
      );
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const addEarnings = useCallback(
    async (amount: number) => {
      if (!profile) return 0;
      const next = Math.max(0, profile.balance + amount);
      const { error } = await supabase
        .from("profiles")
        .update({ balance: next })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, balance: next });
      return next;
    },
    [profile],
  );

  const requestWithdrawal = useCallback(
    async (amount: number) => {
      if (!profile) return "Sign in to withdraw.";
      const minimum = minWithdrawalFor(profile.premium);
      if (amount < minimum) {
        return `Minimum withdrawal is KSh ${minimum.toLocaleString("en-KE")}.`;
      }
      if (amount > profile.balance) return "Insufficient balance.";

      await supabase.from("transactions").insert({
        user_id: profile.id,
        type: "withdrawal",
        amount,
        status: "pending",
      });
      const next = profile.balance - amount;
      await supabase
        .from("profiles")
        .update({ balance: next })
        .eq("id", profile.id);
      setProfile({ ...profile, balance: next });
      return `Withdrawal of KSh ${amount.toLocaleString("en-KE")} requested. It will be sent to M-Pesa after manual approval.`;
    },
    [profile],
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!profile) return;
      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, name });
    },
    [profile],
  );

  /** Used by Account / Premium to attach or correct the M-Pesa number. */
  const updatePhone = useCallback(
    async (phone: string) => {
      if (!profile) return;
      const username = phoneDigits(phone);
      const { error } = await supabase
        .from("profiles")
        .update({ phone, username })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, phone, username });
    },
    [profile],
  );

  const value = useMemo<AuthContextValue>(() => {
    const isPremium = profile?.premium ?? false;
    return {
      session,
      profile,
      loading,
      isLoggedIn: session != null,
      isPremium,
      balance: profile?.balance ?? 0,
      // Username *is* the phone number — there is no separate handle.
      username: profile?.phone ?? profile?.username ?? null,
      dailyLimit: isPremium ? null : dailyQuestionLimit,
      withdrawalMinimum: minWithdrawalFor(isPremium),
      register,
      login,
      logout,
      refreshProfile,
      addEarnings,
      requestWithdrawal,
      updateName,
      updatePhone,
    };
  }, [
    session,
    profile,
    loading,
    register,
    login,
    logout,
    refreshProfile,
    addEarnings,
    requestWithdrawal,
    updateName,
    updatePhone,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
