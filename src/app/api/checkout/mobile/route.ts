/**
 * POST /api/checkout/mobile
 * Handles mobile checkout with Bearer token authentication & CORS.
 */
import { NextResponse } from "next/server";
import { CheckoutError, createCheckout, type CheckoutInput } from "@/lib/orders";
import { getEnv } from "@/lib/cloudflare";
import { parseDelivery } from "@/lib/delivery";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { sha256Hex, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function resolveUserId(request: Request): Promise<string | null> {
  const { DB } = await getEnv();
  const now = new Date().toISOString();

  // 1. Try Bearer token from Authorization header (mobile app)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const tokenHash = await sha256Hex(token);
    const row = await DB.prepare(
      "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?"
    )
      .bind(tokenHash, now)
      .first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  // 2. Fall back to cookie (web)
  const jar = await cookies();
  const cookieToken = jar.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    const tokenHash = await sha256Hex(cookieToken);
    const row = await DB.prepare(
      "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?"
    )
      .bind(tokenHash, now)
      .first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  return null;
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
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in or create an account to complete your purchase." },
      { status: 401, headers: CORS }
    );
  }

  const limited = await rateLimit([[`checkout:user:${userId}`, LIMITS.checkoutUser]]);
  if (limited) {
    return new Response(limited.body, { status: limited.status, headers: { ...CORS, "Content-Type": "application/json" } });
  }

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
