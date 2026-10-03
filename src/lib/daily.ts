import { supabase } from "./supabase";

/// Daily question allowance, stored in Supabase so it can't be reset by
/// clearing the browser. Falls back to localStorage if the `daily_answers`
/// table hasn't been created yet.

const localKey = (userId: string) => `tpweb_daily:${userId}:${todayKey()}`;

export function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function localGet(userId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(localKey(userId));
  return raw == null ? 0 : Number(raw) || 0;
}

function localSet(userId: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localKey(userId), String(value));
}

export async function getAnsweredToday(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("daily_answers")
      .select("count")
      .eq("user_id", userId)
      .eq("day", todayKey())
      .maybeSingle();
    if (error) throw error;
    return data?.count ?? 0;
  } catch {
    return localGet(userId);
  }
}

/** Records one answered question and returns the new day's total. */
export async function recordAnswer(userId: string): Promise<number> {
  const next = (await getAnsweredToday(userId)) + 1;
  try {
    await supabase
      .from("daily_answers")
      .upsert(
        { user_id: userId, day: todayKey(), count: next },
        { onConflict: "user_id,day" },
      );
  } catch {
    // Table missing / offline — the local counter still applies.
  }
  localSet(userId, next);
  return next;
}
