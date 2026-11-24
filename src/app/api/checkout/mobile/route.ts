/**
 * POST /api/checkout/mobile
 * Handles mobile checkout with Bearer token authentication & CORS.
 */
import { NextResponse } from "next/server";
import { corsHeaders, withCors } from "@/lib/cors";
import { CheckoutError, createCheckout, type CheckoutInput } from "@/lib/orders";
import { getEnv } from "@/lib/cloudflare";
import { parseDelivery } from "@/lib/delivery";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "POST, OPTIONS") });
}

/**
 * The signed-in account's id, from the mobile app's Bearer token or the website cookie. Uses the
 * site's central session rules, so a session still waiting for its 2FA code is refused here too.
 */
async function resolveUser(request: Request) {
  return getUserFromRequest(request).catch(() => null);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseInput(raw: unknown): CheckoutInput | string {
  if (!raw || typeof raw !== "object") return "Invalid request.";
  const b = raw as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  if (name.length < 2 || name.length > 120) return "Please enter your name.";
  if (!EMAIL_RE.test(email) || email.length > 200) return "Please enter a valid email.";
  if (phone.length < 7 || phone.length > 30) return "Please enter a valid phone number.";

  const delivery = parseDelivery(b.delivery);
  if (typeof delivery === "string") return delivery;

  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 50) {
    return "Your cart is empty.";
  }

  const items = [];
  for (const it of b.items) {
    if (!it || typeof it !== "object") return "Invalid cart item.";
    const i = it as Record<string, unknown>;
    const slug = typeof i.slug === "string" ? i.slug.trim() : "";
    const color = typeof i.color === "string" ? i.color.trim() : "Standard";
    const quantity = typeof i.quantity === "number" ? i.quantity : Number(i.quantity) || 1;
    if (!slug) return "Invalid cart item slug.";
    items.push({ slug: slug.slice(0, 200), color: color.slice(0, 60), quantity });
  }

  return { name, email, phone, delivery, items };
}

export async function POST(request: Request) {
  const CORS = corsHeaders(request, "POST, OPTIONS");
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in or create an account to complete your purchase." },
      { status: 401, headers: CORS }
    );
  }
  const userId = user.id;
  // Receipts and delivery updates go by email, so the address must be confirmed before paying.
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please confirm your email address first: open the link we emailed you, or resend it from your account.", emailVerificationRequired: true },
      { status: 403, headers: CORS }
    );
  }

  const limited = await rateLimit([[`checkout:user:${userId}`, LIMITS.checkoutUser]]);
  if (limited) return withCors(limited, CORS);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400, headers: CORS });
  }

  const input = parseInput(raw);
  if (typeof input === "string") {
    return NextResponse.json({ error: input }, { status: 400, headers: CORS });
  }

  try {
    const env = await getEnv();
    const origin = env.SITE_URL || new URL(request.url).origin;
    const { authorizationUrl, reference } = await createCheckout(input, origin, userId);
    return NextResponse.json({ authorizationUrl, reference }, { headers: CORS });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: CORS });
    }
    console.error("mobile checkout failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500, headers: CORS });
  }
}
