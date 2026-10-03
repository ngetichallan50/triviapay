import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { premiumPrice, supabaseAnonKey, supabaseUrl } from "@/lib/config";
import { normalizeKenyanPhone } from "@/lib/format";
import { gatewaySecret, gatewayUrl } from "@/lib/paymentGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the M-Pesa STK push for the KSh 250 Premium subscription.
 *
 * Security: the browser never sees the gateway secret and never chooses the
 * amount or the phone number. We require the caller's Supabase session, look up
 * the phone on their own `profiles` row, and send a fixed server-side amount —
 * so the endpoint can't be abused to spam prompts or pay the wrong amount.
 */
export async function POST(req: NextRequest) {
  if (!gatewaySecret) {
    return NextResponse.json(
      {
        success: false,
        code: "not_configured",
        error:
          "Payments aren't configured yet. Set PAYMENT_APP_SECRET in the environment.",
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
          "Add a valid M-Pesa number to your account first (Account → phone).",
      },
      { status: 400 },
    );
  }
  const msisdn = phone.replace(/^\+/, ""); // gateway wants 2547XXXXXXXX

  const reference = `TP-${user.id.slice(0, 8)}-${Date.now()}`.slice(0, 50);

  let res: Response;
  try {
    res = await fetch(`${gatewayUrl}/api/stk-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Secret": gatewaySecret,
      },
      body: JSON.stringify({
        phone: msisdn,
        amount: premiumPrice,
        reference,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "gateway_unreachable",
        error: "Could not reach the payment service. Please try again.",
      },
      { status: 502 },
    );
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || body.success === false) {
    const retryAfter = body.retryAfter as number | undefined;
    const error =
      (body.error as string) ??
      (body.message as string) ??
      "Could not send the M-Pesa prompt.";
    return NextResponse.json(
      {
        success: false,
        code: res.status === 429 ? "rate_limited" : "provider_rejected",
        error,
        retryAfter,
      },
      { status: res.status === 429 ? 429 : 502 },
    );
  }

  const transactionRequestId = body.transactionRequestId as string | undefined;
  if (!transactionRequestId) {
    return NextResponse.json(
      {
        success: false,
        code: "provider_rejected",
        error: "The payment service did not return a transaction id.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    amount: premiumPrice,
    phone: msisdn,
    transactionRequestId,
    message:
      (body.message as string) ??
      "Check your phone for the M-Pesa prompt and enter your PIN.",
  });
}
