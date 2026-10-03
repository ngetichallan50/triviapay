import { NextResponse } from "next/server";
import {
  checkTransactionStatus,
  isPaywaveConfigured,
  paywaveBaseUrl,
} from "@/lib/paywave";
import { isServiceRoleConfigured } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pay/health
 *
 * Self-check for the Paywave wiring. Reports which env vars are present and
 * makes one harmless `/v1/tstatus` call to see whether Paywave accepts the
 * credentials. **No secret is ever returned, and no STK push is sent.**
 *
 * Visit https://www.triviapay.online/api/pay/health
 */
export async function GET() {
  const configured = isPaywaveConfigured();
  const serviceRole = isServiceRoleConfigured();

  const base = {
    paywave: {
      configured,
      baseUrl: paywaveBaseUrl,
      hasApiKey: Boolean(process.env.PAYWAVE_API_KEY?.trim()),
      hasEmail: Boolean(process.env.PAYWAVE_EMAIL?.trim()),
      hasAccountNumber: Boolean(process.env.PAYWAVE_ACCOUNT_NUMBER?.trim()),
    },
    supabaseServiceRole: serviceRole,
  };

  if (!configured) {
    return NextResponse.json(
      {
        ...base,
        credentialsAccepted: null,
        hint: "PAYWAVE_API_KEY and/or PAYWAVE_EMAIL are not set on this deployment. Add them in Vercel (Production) and redeploy.",
      },
      { status: 503 },
    );
  }

  // A status lookup for a non-existent id costs nothing and sends no prompt.
  const probe = await checkTransactionStatus("healthcheck");
  const probeMessage = probe.ok ? null : probe.error;

  // Paywave answers 102 / "api_key" when the credentials themselves are bad.
  const credentialsAccepted = !(
    !probe.ok && /api_key|api key/i.test(probeMessage ?? "")
  );

  const problems: string[] = [];
  if (!credentialsAccepted) {
    problems.push(
      "Paywave rejected the credentials — check PAYWAVE_API_KEY / PAYWAVE_EMAIL.",
    );
  }
  if (!serviceRole) {
    problems.push(
      "SUPABASE_SERVICE_ROLE_KEY is missing, so Premium can't be activated after payment.",
    );
  }

  return NextResponse.json({
    ...base,
    credentialsAccepted,
    probe: probeMessage,
    ok: credentialsAccepted && serviceRole,
    hint:
      problems.length === 0
        ? "Payment wiring looks good. Remaining step: confirm profiles.premium / profiles.premium_since exist in Supabase."
        : problems.join(" "),
  });
}
