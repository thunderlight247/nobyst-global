import type { CloudflareEnv } from "../cloudflare";

/**
 * Hubtel Online Checkout.
 *
 * Starting a payment: POST https://payproxyapi.hubtel.com/items/initiate with HTTP Basic auth
 * (API ID : API key). Hubtel answers with a checkout page URL and a checkout id.
 *
 * Confirming a payment: Hubtel POSTs a callback to our callbackUrl. Hubtel does not sign
 * callbacks, so:
 *   1. each order's callback URL carries an HMAC of its reference (HUBTEL_CALLBACK_SECRET). Only
 *      Hubtel is ever given that URL, so a forged callback cannot carry a valid signature;
 *   2. the callback must echo our reference and the checkout id Hubtel gave us, report success,
 *      and cover the order total;
 *   3. if HUBTEL_STATUS_RELAY_URL is set, Hubtel's Transaction Status API must also confirm the
 *      payment. That API only accepts requests from a fixed IP whitelisted by Hubtel, which
 *      Cloudflare Workers do not have, so it is reached through a small relay with a fixed IP.
 *
 * FIELD NAMES: Hubtel's documentation was not reachable when this was written. Field names
 * follow Hubtel's published examples (ResponseCode / Data.CheckoutId / Data.ClientReference /
 * Data.Amount ...) and are read case-insensitively. Confirm them against the client's Hubtel
 * documentation, and make one small real payment, before switching PAYMENT_PROVIDER to hubtel.
 */

const INITIATE_URL = "https://payproxyapi.hubtel.com/items/initiate";

/** Reads a field regardless of casing (Hubtel examples use both ResponseCode and responseCode). */
function field(obj: unknown, name: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const wanted = name.toLowerCase();
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) if (k.toLowerCase() === wanted) return v;
  return undefined;
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);

function basicAuth(env: CloudflareEnv): string {
  return `Basic ${btoa(`${env.HUBTEL_CLIENT_ID}:${env.HUBTEL_CLIENT_SECRET}`)}`;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The secret callback address for one order. */
export async function hubtelCallbackUrl(env: CloudflareEnv, origin: string, reference: string): Promise<string> {
  const sig = await hmacHex(env.HUBTEL_CALLBACK_SECRET!, `hubtel-callback:${reference}`);
  return `${origin}/api/hubtel/callback?reference=${encodeURIComponent(reference)}&sig=${sig}`;
}

export async function hubtelCallbackSignatureValid(env: CloudflareEnv, reference: string, sig: string): Promise<boolean> {
  if (!env.HUBTEL_CALLBACK_SECRET || !/^[0-9a-f]{64}$/.test(sig)) return false;
  return timingSafeEqual(await hmacHex(env.HUBTEL_CALLBACK_SECRET, `hubtel-callback:${reference}`), sig);
}

/** Starts a Hubtel checkout. Returns the page to send the customer to and Hubtel's checkout id. */
export async function startHubtelPayment(
  env: CloudflareEnv,
  input: { reference: string; amountPesewas: number; description: string; origin: string }
): Promise<{ checkoutUrl: string; checkoutId: string | null } | { error: string }> {
  const res = await fetch(INITIATE_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(env), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      totalAmount: Math.round(input.amountPesewas) / 100, // Hubtel takes cedis, e.g. 45.5
      description: input.description.slice(0, 100),
      callbackUrl: await hubtelCallbackUrl(env, input.origin, input.reference),
      returnUrl: `${input.origin}/checkout/verify?reference=${encodeURIComponent(input.reference)}`,
      cancellationUrl: `${input.origin}/cart?payment=cancelled`,
      merchantAccountNumber: env.HUBTEL_MERCHANT_ACCOUNT,
      clientReference: input.reference,
    }),
  });
  const body = (await res.json().catch(() => null)) as unknown;
  const data = field(body, "data");
  const checkoutUrl = str(field(data, "checkoutUrl"));
  const code = str(field(body, "responseCode"));
  if (!res.ok || code !== "0000" || !checkoutUrl || !checkoutUrl.startsWith("https://")) {
    console.error("hubtel initiate failed", res.status, code, str(field(body, "message")) ?? str(field(body, "status")));
    return { error: "Could not start payment. Please try again." };
  }
  return { checkoutUrl, checkoutId: str(field(data, "checkoutId")) };
}

export type HubtelCallback = {
  responseCode: string | null;
  status: string | null;
  clientReference: string | null;
  checkoutId: string | null;
  transactionId: string | null;
  amountPesewas: number | null;
};

/** Normalises Hubtel's callback body (top-level ResponseCode/Status, details under Data). */
export function parseHubtelCallback(body: unknown): HubtelCallback {
  const data = field(body, "data") ?? {};
  const amount = Number(str(field(data, "amount")) ?? NaN);
  return {
    responseCode: str(field(body, "responseCode")),
    status: str(field(data, "status")) ?? str(field(body, "status")),
    clientReference: str(field(data, "clientReference")),
    checkoutId: str(field(data, "checkoutId")),
    transactionId: str(field(data, "salesInvoiceId")) ?? str(field(data, "transactionId")),
    amountPesewas: Number.isFinite(amount) ? Math.round(amount * 100) : null,
  };
}

export function hubtelCallbackIsSuccess(cb: HubtelCallback): boolean {
  return cb.responseCode === "0000" && ["success", "paid", "successful"].includes((cb.status ?? "").toLowerCase());
}

export function hubtelCallbackIsFailure(cb: HubtelCallback): boolean {
  return ["failed", "cancelled", "canceled", "expired", "declined"].includes((cb.status ?? "").toLowerCase());
}

/**
 * Optional independent check with Hubtel's Transaction Status API, through a relay that has a
 * fixed IP whitelisted by Hubtel (HUBTEL_STATUS_RELAY_URL + HUBTEL_STATUS_RELAY_TOKEN). The relay
 * forwards GET /transactions/{merchant}/status?clientReference=… and returns Hubtel's JSON.
 * Returns null when no relay is configured.
 */
export async function hubtelRelayStatus(
  env: CloudflareEnv,
  reference: string
): Promise<{ paid: boolean; amountPesewas: number | null } | null> {
  if (!env.HUBTEL_STATUS_RELAY_URL || !env.HUBTEL_STATUS_RELAY_TOKEN) return null;
  const url = `${env.HUBTEL_STATUS_RELAY_URL.replace(/\/$/, "")}/transactions/${encodeURIComponent(env.HUBTEL_MERCHANT_ACCOUNT ?? "")}/status?clientReference=${encodeURIComponent(reference)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.HUBTEL_STATUS_RELAY_TOKEN}`, Accept: "application/json" } });
  const body = (await res.json().catch(() => null)) as unknown;
  const data = field(body, "data") ?? {};
  const status = (str(field(data, "status")) ?? "").toLowerCase();
  const amount = Number(str(field(data, "amount")) ?? NaN);
  const echoed = str(field(data, "clientReference"));
  return {
    paid: res.ok && str(field(body, "responseCode")) === "0000" && status === "paid" && echoed === reference,
    amountPesewas: Number.isFinite(amount) ? Math.round(amount * 100) : null,
  };
}
