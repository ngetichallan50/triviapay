import { NextResponse, type NextRequest } from "next/server";
import { gatewaySecret, gatewayUrl } from "@/lib/paymentGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies a transaction-status check to the payment gateway.
 *
 * Always answers 200 with a `status` so the client poll loop keeps working even
 * when the gateway is briefly unreachable — an unknown status must never be
 * treated as a declined payment.
 */
export async function GET(req: NextRequest) {
  if (!gatewaySecret) {
    return NextResponse.json(
      { success: false, status: "Pending", error: "Payments aren't configured." },
      { status: 200 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, status: "Pending", error: "Sign in first." },
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

  try {
    const res = await fetch(
      `${gatewayUrl}/api/transaction-status?txn_id=${encodeURIComponent(txnId)}`,
      {
        headers: { "X-App-Secret": gatewaySecret },
        cache: "no-store",
      },
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json({
        success: false,
        status: "Pending",
        error: (body.error as string) ?? "Status temporarily unavailable.",
      });
    }
    return NextResponse.json({ success: true, ...body });
  } catch {
    return NextResponse.json({
      success: false,
      status: "Pending",
      error: "Could not reach the payment service.",
    });
  }
}
