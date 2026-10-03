/// Server-only Paywave Express client.
///
/// Docs: https://paywavexpress.co.ke/documentation
///
/// Paywave authenticates every call with `api_key` + `email` sent in the JSON
/// body. Both live in server env vars and are never shipped to the browser —
/// only route handlers under `src/app/api/**` may import this module.

const DEFAULT_BASE_URL = "https://paywavexpress.co.ke";

export const paywaveBaseUrl = (
  process.env.PAYWAVE_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const apiKey = process.env.PAYWAVE_API_KEY?.trim() ?? "";
const email = process.env.PAYWAVE_EMAIL?.trim() ?? "";
/** Only needed for Paybill accounts; empty for Till Numbers. */
const accountNumber = process.env.PAYWAVE_ACCOUNT_NUMBER?.trim() ?? "";

export const isPaywaveConfigured = (): boolean => apiKey !== "" && email !== "";

export type PaywaveStatus = "Pending" | "Completed" | "Failed" | "Cancelled";

/** Paywave `ResultCode` values, turned into something a player can read. */
const RESULT_MESSAGES: Record<string, string> = {
  "1": "The M-Pesa balance on that number is too low.",
  "102":
    "Paywave rejected the request. Check PAYWAVE_API_KEY and PAYWAVE_EMAIL on Vercel.",
  "201": "Paywave expected a POST request.",
  "400": "The Paywave account is inactive, or the linked account type is wrong.",
  "503": "Safaricom's M-Pesa API failed. Please try again in a moment.",
  "1001": "A transaction for this number is already in progress.",
  "1025": "Paywave could not send the prompt. Please try again.",
  "1032": "The M-Pesa prompt was cancelled.",
  "1037": "The prompt timed out — the phone was unreachable.",
  "2001":
    "Paywave rejected the initiator details. Check the linked account in the Paywave dashboard.",
};

const explain = (code: string | undefined, fallback?: string): string =>
  (code ? RESULT_MESSAGES[code] : undefined) ||
  fallback ||
  "The payment request failed.";

// ── References ───────────────────────────────────────────────────────────────

/**
 * The payment reference doubles as our receipt-to-user lookup: it carries the
 * Supabase user id so the status check and the webhook can find the player.
 * `TP-` + a uuid is 39 characters — comfortably inside Paywave's limit.
 */
export const premiumReference = (userId: string): string => `TP-${userId}`;

export const userIdFromReference = (
  reference: string | null | undefined,
): string | null => {
  const match = /^TP-([0-9a-fA-F-]{36})$/.exec((reference ?? "").trim());
  return match ? match[1] : null;
};

// ── STK Push ─────────────────────────────────────────────────────────────────

export type StkPushOutcome =
  | {
      ok: true;
      transactionRequestId: string;
      message: string;
      merchantRequestId: string | null;
      checkoutRequestId: string | null;
    }
  | { ok: false; code: string; error: string };

/**
 * Sends the M-Pesa STK push ("popup") to the customer's phone.
 * A success here only means Paywave accepted the prompt — the money hasn't
 * moved yet. Always confirm with `checkTransactionStatus`.
 */
export async function initiateStkPush(params: {
  /** Customer's phone as `2547XXXXXXXX` (or `07XXXXXXXX`). */
  msisdn: string;
  /** Whole KES. */
  amount: number;
  reference: string;
}): Promise<StkPushOutcome> {
  const body: Record<string, string> = {
    api_key: apiKey,
    email,
    amount: String(params.amount),
    msisdn: params.msisdn,
    reference: params.reference,
  };
  if (accountNumber) body.account_number = accountNumber;

  let res: Response;
  try {
    res = await fetch(`${paywaveBaseUrl}/v1/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      code: "paywave_unreachable",
      error: "Could not reach Paywave Express. Please try again.",
    };
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const txnId = data.transaction_request_id as string | undefined;

  if (txnId && String(data.ResponseCode ?? "") === "0") {
    return {
      ok: true,
      transactionRequestId: txnId,
      message:
        (data.message as string) ??
        "Check your phone for the M-Pesa prompt and enter your PIN.",
      merchantRequestId: (data.MerchantRequestID as string) ?? null,
      checkoutRequestId: (data.CheckoutRequestID as string) ?? null,
    };
  }

  const code = String(data.ResultCode ?? res.status);
  console.error(`[paywave] stkpush failed: ResultCode=${code} http=${res.status}`);
  return {
    ok: false,
    code: `paywave_${code}`,
    error: explain(code, data.errorMessage as string | undefined),
  };
}

// ── Transaction status ───────────────────────────────────────────────────────

export type StatusOutcome =
  | {
      ok: true;
      status: PaywaveStatus;
      receipt: string | null;
      amount: string | null;
      phone: string | null;
      reference: string | null;
    }
  | { ok: false; error: string };

const STATUSES: PaywaveStatus[] = [
  "Pending",
  "Completed",
  "Failed",
  "Cancelled",
];

/** Authoritative check — this is what decides whether money actually moved. */
export async function checkTransactionStatus(
  transactionRequestId: string,
): Promise<StatusOutcome> {
  let res: Response;
  try {
    res = await fetch(`${paywaveBaseUrl}/v1/tstatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        email,
        transaction_request_id: transactionRequestId,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach Paywave Express." };
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(data.TransactionStatus ?? "");

  if (STATUSES.includes(status as PaywaveStatus)) {
    return {
      ok: true,
      status: status as PaywaveStatus,
      receipt: (data.TransactionReceipt as string) ?? null,
      amount: (data.TransactionAmount as string) ?? null,
      phone: (data.Msisdn as string) ?? null,
      reference: (data.TransactionReference as string) ?? null,
    };
  }

  console.error(
    `[paywave] tstatus failed: ResultCode=${String(data.ResultCode)} http=${res.status}`,
  );
  return {
    ok: false,
    error: explain(
      String(data.ResultCode ?? ""),
      data.errorMessage as string | undefined,
    ),
  };
}
