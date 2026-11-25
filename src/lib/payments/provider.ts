import type { CloudflareEnv } from "../cloudflare";

/**
 * Which payment provider takes new payments.
 *
 * - `PAYMENT_PROVIDER=hubtel` (wrangler var) switches to Hubtel once its four secrets are set:
 *   HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_MERCHANT_ACCOUNT, HUBTEL_CALLBACK_SECRET.
 * - Otherwise Paystack, while PAYSTACK_SECRET_KEY is set (kept until Hubtel is proven).
 * - Null when neither is configured: checkout says online payment is not set up yet.
 *
 * Orders remember the provider they were started with, so a switch never strands an order that
 * is already being paid.
 */
export type PaymentProvider = "paystack" | "hubtel";

export function hubtelConfigured(env: CloudflareEnv): boolean {
  return Boolean(env.HUBTEL_CLIENT_ID && env.HUBTEL_CLIENT_SECRET && env.HUBTEL_MERCHANT_ACCOUNT && env.HUBTEL_CALLBACK_SECRET);
}

export function activeProvider(env: CloudflareEnv): PaymentProvider | null {
  if (env.PAYMENT_PROVIDER === "hubtel") return hubtelConfigured(env) ? "hubtel" : null;
  return env.PAYSTACK_SECRET_KEY ? "paystack" : null;
}

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  paystack: "Paystack",
  hubtel: "Hubtel",
};
