import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/config";
import { checkTransactionStatus, isPaywaveConfigured, userIdFromReference } from "@/lib/paywave";
import { activatePremiumForUser, isServiceRoleConfigured } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turns Premium on for a payment that Paywave confirms is `Completed`.
 *
 * The client sends the `transaction_request_id` it was given; we re-check with
 * Paywave (never trusting the browser), make sure the reference belongs to the
 * caller, and only then activate — so a player can't fake a payment or replay
 * somebody else's receipt.
 */
export async function POST(req: NextRequest) {
  if (!isPaywaveConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Premium activation isn't configured. Set PAYWAVE_API_KEY, PAYWAVE_EMAIL and SUPABASE_SERVICE_ROLE_KEY on Vercel.",
      },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Sign in first." },
      { status: 401 },
    );
  }

  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { txn_id?: string };
  const txnId = body.txn_id?.trim();
  if (!txnId) {
    return NextResponse.json(
      { success: false, error: "Missing txn_id." },
      { status: 400 },
    );
  }

  const payment = await checkTransactionStatus(txnId);
  if (!payment.ok) {
    return NextResponse.json(
      { success: false, error: payment.error },
      { status: 502 },
    );
  }

  if (payment.status !== "Completed") {
    return NextResponse.json(
      {
        success: false,
        status: payment.status,
        error: `Payment is ${payment.status} — Premium has not been activated.`,
      },
      { status: 409 },
    );
  }

  // The reference we sent was `TP-<userId>`; make sure it's this user's.
  if (userIdFromReference(payment.reference) !== user.id) {
    console.error(
      `[pay/activate] reference/user mismatch for txn ${txnId}`,
    );
    return NextResponse.json(
      { success: false, error: "That payment doesn't belong to this account." },
      { status: 403 },
    );
  }

  const activation = await activatePremiumForUser(user.id);
  if (!activation.ok) {
    return NextResponse.json(
      { success: false, error: activation.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    premium: true,
    receipt: payment.receipt,
    amount: payment.amount,
  });
}
