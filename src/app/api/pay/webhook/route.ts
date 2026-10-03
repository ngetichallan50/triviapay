import { NextResponse, type NextRequest } from "next/server";
import { checkTransactionStatus, isPaywaveConfigured, userIdFromReference } from "@/lib/paywave";
import { activatePremiumForUser, isServiceRoleConfigured } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paywave webhook receiver.
 *
 * Configure this URL in the Paywave dashboard (Account settings → webhook):
 *   https://www.triviapay.online/api/pay/webhook
 *
 * Paywave doesn't sign its callbacks, so the payload is treated as a *hint*
 * only: we look the transaction up with `/v1/tstatus` and act on Paywave's own
 * answer. That makes a forged callback harmless.
 *
 * Always answers 200 so Paywave doesn't retry forever.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const txnId = String(
    body.TransactionID ?? body.transaction_request_id ?? "",
  ).trim();

  if (!txnId) {
    return NextResponse.json({ success: false, error: "Missing TransactionID." });
  }

  if (!isPaywaveConfigured() || !isServiceRoleConfigured()) {
    console.error("[pay/webhook] not configured; ignoring callback");
    return NextResponse.json({ success: true, ignored: true });
  }

  const payment = await checkTransactionStatus(txnId);
  if (!payment.ok || payment.status !== "Completed") {
    return NextResponse.json({
      success: true,
      settled: false,
      status: payment.ok ? payment.status : "Unknown",
    });
  }

  const userId = userIdFromReference(payment.reference);
  if (!userId) {
    console.error(`[pay/webhook] unrecognised reference for txn ${txnId}`);
    return NextResponse.json({ success: true, ignored: true });
  }

  const activation = await activatePremiumForUser(userId);
  if (!activation.ok) {
    console.error(`[pay/webhook] activation failed: ${activation.error}`);
  }

  return NextResponse.json({
    success: true,
    settled: activation.ok,
    receipt: payment.receipt,
  });
}
