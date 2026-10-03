import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/config";
import { checkTransactionStatus, isPaywaveConfigured } from "@/lib/paywave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies a transaction-status check to Paywave Express.
 *
 * Always answers `200` with a `status` so the client poll loop keeps working
 * even when Paywave is briefly unreachable — an unknown status must never be
 * shown to the player as a declined payment.
 */
export async function GET(req: NextRequest) {
  if (!isPaywaveConfigured()) {
    return NextResponse.json({
      success: false,
      status: "Pending",
      error: "Payments aren't configured.",
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json(
      { success: false, status: "Pending", error: "Sign in first." },
      { status: 401 },
    );
  }

  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) {
    return NextResponse.json(
      { success: false, status: "Pending", error: "Your session expired." },
      { status: 401 },
    );
  }

  const txnId = req.nextUrl.searchParams.get("txn_id");
  if (!txnId) {
    return NextResponse.json(
      { success: false, status: "Pending", error: "Missing txn_id." },
      { status: 400 },
    );
  }

  const result = await checkTransactionStatus(txnId);
  if (!result.ok) {
    return NextResponse.json({
      success: false,
      status: "Pending",
      error: result.error,
    });
  }

  return NextResponse.json({
    success: true,
    status: result.status,
    receipt: result.receipt,
    amount: result.amount,
    phone: result.phone,
    reference: result.reference,
  });
}
