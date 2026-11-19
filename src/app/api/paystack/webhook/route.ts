import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { verifyCheckout } from "@/lib/orders";
import { isValidPaystackSignature } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

/**
 * Paystack webhook. Confirms payments even when the customer closes the tab before returning
 * to /checkout/verify. Set this URL in Paystack → Settings → API Keys & Webhooks:
 *   https://<site>/api/paystack/webhook
 *
 * The request is accepted only with a valid x-paystack-signature (HMAC-SHA512 of the raw body
 * with the secret key). Even then the body is not trusted: verifyCheckout asks Paystack's API
 * for the transaction and checks the amount and currency before marking an order paid.
 */
export async function POST(request: Request) {
  const env = await getEnv();
  if (!env.PAYSTACK_SECRET_KEY) return new NextResponse(null, { status: 503 });

  const signature = request.headers.get("x-paystack-signature") ?? "";
  const body = await request.text();
  if (body.length > MAX_BODY || !(await isValidPaystackSignature(env.PAYSTACK_SECRET_KEY, body, signature))) {
    return new NextResponse(null, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: unknown } };
  try {
    event = JSON.parse(body);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event === "charge.success" && typeof reference === "string" && /^[A-Za-z0-9-]{4,80}$/.test(reference)) {
    try {
      const result = await verifyCheckout(reference);
      console.log("paystack webhook", reference, result);
    } catch (err) {
      // A 5xx makes Paystack retry later, which is what we want if D1 or their API blipped.
      console.error("paystack webhook verify failed", reference, err);
      return new NextResponse(null, { status: 500 });
    }
  }
  // Other events are acknowledged and ignored.
  return new NextResponse(null, { status: 200 });
}
