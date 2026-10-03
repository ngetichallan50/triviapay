import { NextResponse } from "next/server";
import { gatewaySecret, gatewayUrl } from "@/lib/paymentGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pay/health
 *
 * Self-check for the M-Pesa gateway wiring. It calls the gateway's
 * (harmless, no-push) status endpoint with our `X-App-Secret` and reports
 * whether that secret is accepted.
 *
 * The secret itself is never returned — only a boolean.
 *
 * Visit https://www.triviapay.online/api/pay/health after setting env vars.
 */
export async function GET() {
  if (!gatewaySecret) {
    return NextResponse.json(
      {
        configured: false,
        secretAccepted: null,
        gateway: gatewayUrl,
        hint: "PAYMENT_APP_SECRET is not set on this deployment. Add it in Vercel (Production) and redeploy.",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(
      `${gatewayUrl}/api/transaction-status?txn_id=healthcheck`,
      {
        headers: { "X-App-Secret": gatewaySecret },
        cache: "no-store",
      },
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    // 401 = our secret is wrong. 500 = the gateway has no APP_SECRET at all.
    // Anything else (400/502 from Paywave) means the secret was accepted.
    const secretAccepted = res.status !== 401 && res.status !== 500;

    return NextResponse.json({
      configured: true,
      secretAccepted,
      gateway: gatewayUrl,
      gatewayStatus: res.status,
      providerMessage: (body.error as string) ?? null,
      hint: secretAccepted
        ? "Secret accepted by the gateway — payments are wired correctly."
        : res.status === 401
          ? "The gateway rejected our X-App-Secret. Copy APP_SECRET from the payment gateway's Vercel project into PAYMENT_APP_SECRET here (no quotes, no trailing spaces, same value), then redeploy."
          : "The gateway has no APP_SECRET set. Add APP_SECRET to the payment gateway project and redeploy it.",
    });
  } catch {
    return NextResponse.json(
      {
        configured: true,
        secretAccepted: null,
        gateway: gatewayUrl,
        hint: "Could not reach the gateway from this deployment (network or wrong PAYMENT_GATEWAY_URL).",
      },
      { status: 502 },
    );
  }
}
