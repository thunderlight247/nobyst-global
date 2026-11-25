import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { hubtelCallbackSignatureValid, parseHubtelCallback } from "@/lib/payments/hubtel";
import { recordHubtelCallback } from "@/lib/orders";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const MAX_BODY = 32 * 1024;

/**
 * Hubtel's payment callback. Hubtel does not sign callbacks, so each order's callback URL carries
 * an HMAC of its reference that only Hubtel is given; anything without a valid one is refused.
 * The body then has to echo our reference and Hubtel's checkout id and cover the order total
 * (see recordHubtelCallback). Replies 200 for anything handled so Hubtel stops retrying.
 */
export async function POST(request: Request) {
  const env = await getEnv();
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!/^[A-Za-z0-9-]{4,80}$/.test(reference) || !(await hubtelCallbackSignatureValid(env, reference, sig))) {
    await logActivity({ actor: null, action: "payment.callback_rejected", entityId: reference.slice(0, 80) || null, summary: `Rejected a Hubtel callback with a missing or wrong signature`, request });
    return new NextResponse(null, { status: 401 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const cb = parseHubtelCallback(body);
  const result = await recordHubtelCallback(reference, cb);
  if (result === "mismatch") {
    // A signed URL with details that do not match the order: record it for the admin.
    await logActivity({
      actor: null,
      action: "payment.callback_mismatch",
      entityId: reference,
      summary: `Hubtel callback for ${reference} did not match the order (status ${cb.status ?? "?"}, amount ${cb.amountPesewas ?? "?"} pesewas); not marked paid`,
      request,
    });
  }
  return NextResponse.json({ ok: true, result });
}
