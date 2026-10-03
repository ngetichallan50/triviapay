/// Server-only Supabase admin client + premium activation.
///
/// The service-role key bypasses RLS, so this module must only ever be imported
/// from route handlers under `src/app/api/**`. Without it a player could simply
/// update their own `profiles` row and give themselves Premium for free.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export const isServiceRoleConfigured = (): boolean => serviceRoleKey !== "";

export function createServiceClient(): SupabaseClient | null {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ActivationOutcome = { ok: true } | { ok: false; error: string };

/**
 * Flips `profiles.premium` on, server-side, for a *verified* payment only.
 * Idempotent — activating twice is harmless.
 */
export async function activatePremiumForUser(
  userId: string,
): Promise<ActivationOutcome> {
  const admin = createServiceClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Premium can't be activated: SUPABASE_SERVICE_ROLE_KEY is not set on this deployment.",
    };
  }

  const { error } = await admin
    .from("profiles")
    .update({ premium: true, premium_since: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    const missingColumn =
      /column .*(premium|premium_since).*?does not exist|schema cache/i.test(
        error.message,
      );
    return {
      ok: false,
      error: missingColumn
        ? "Premium needs a one-time database setup: run the premium SQL migration in Supabase (adds profiles.premium and profiles.premium_since)."
        : error.message,
    };
  }

  return { ok: true };
}
