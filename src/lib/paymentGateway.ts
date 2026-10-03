/// Server-only payment-gateway configuration.
///
/// The TriviaPay web app talks to the app-facing M-Pesa gateway
/// (`/api/stk-push`, `/api/transaction-status`) through our own Next.js route
/// handlers, so the shared `X-App-Secret` lives only in server env vars and is
/// never shipped to the browser.
///
/// Only import this from `src/app/api/**` route handlers.

/// Base URL of the deployed payment gateway.
export const gatewayUrl =
  process.env.PAYMENT_GATEWAY_URL ?? "https://payment-process-seven.vercel.app";

/// Shared app secret sent as `X-App-Secret` (set in Vercel env vars).
export const gatewaySecret =
  process.env.PAYMENT_APP_SECRET ?? process.env.APP_SECRET ?? "";

export const isGatewayConfigured = (): boolean => gatewaySecret !== "";
