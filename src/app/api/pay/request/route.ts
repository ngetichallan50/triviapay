import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { premiumPrice, supabaseAnonKey, supabaseUrl } from "@/lib/config";
import { normalizeKenyanPhone } from "@/lib/format";
import {
  initiateStkPush,
  isPaywaveConfigured,
  premiumReference,
} from "@/lib/paywave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the M-Pesa STK push for the Premium subscription **straight to
 * Paywave Express** — no intermediate gateway.
 *
 * Security: the browser never chooses the amount or the phone number. We require
 * the caller's Supabase session, read the phone from their own `profiles` row,
 * and send a fixed server-side amount, so the endpoint can't be abused to spam
 * prompts at arbitrary numbers.
 */

/** One prompt per player per 60 seconds (in-memory; resets on cold start). */
const lastPromptAt = new Map<string, number>();
const PROMPT_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  if (!isPaywaveConfigured()) {
    return NextResponse.json(
      {
        success: false,
        code: "not_configured",
        error:
          "Payments aren't configured yet. Set PAYWAVE_API_KEY and PAYWAVE_EMAIL on Vercel.",
      },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json(
      { success: false, code: "unauthenticated", error: "Sign in first." },
      { status: 401 },
    );
  }

  // Act as the caller, so RLS lets us read their own profile and nothing else.
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        code: "invalid_token",
        error: "Your session expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const since = Date.now() - (lastPromptAt.get(user.id) ?? 0);
  if (since < PROMPT_COOLDOWN_MS) {
    const retryAfter = Math.ceil((PROMPT_COOLDOWN_MS - since) / 1000);
    return NextResponse.json(
      {
        success: false,
        code: "rate_limited",
        error: `An M-Pesa prompt was just sent. Wait ${retryAfter}s before trying again.`,
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Phone comes from the user's own profile — never from the browser.
  const { data: profile } = await sb
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const phone = normalizeKenyanPhone(profile?.phone ?? "");
  if (!phone) {
    return NextResponse.json(
      {
        success: false,
        code: "no_phone",
        error:
          "Add a valid M-Pesa number to your account first (Safaricom 07XX / 01XX or Airtel 073X / 078X).",
      },
      { status: 400 },
    );
  }
  const msisdn = phone.replace(/^\+/, ""); // Paywave wants 2547XXXXXXXX

  const result = await initiateStkPush({
    msisdn,
    amount: premiumPrice,
    reference: premiumReference(user.id),
  });

  if (!result.ok) {
    const status = result.code === "paywave_1001" ? 429 : 502;
    return NextResponse.json(
      { success: false, code: result.code, error: result.error },
      { status },
    );
  }

  lastPromptAt.set(user.id, Date.now());

  return NextResponse.json({
    success: true,
    amount: premiumPrice,
    phone: msisdn,
    transactionRequestId: result.transactionRequestId,
    message: result.message,
  });
}
