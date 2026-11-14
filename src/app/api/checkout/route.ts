import { NextResponse } from "next/server";
import { CheckoutError, createCheckout, type CheckoutInput } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseInput(raw: unknown): CheckoutInput | string {
  if (!raw || typeof raw !== "object") return "Invalid request.";
  const b = raw as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  if (name.length < 2 || name.length > 120) return "Please enter your name.";
  if (!EMAIL_RE.test(email) || email.length > 200) return "Please enter a valid email.";
  if (phone.length < 7 || phone.length > 30) return "Please enter a phone number.";
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 50) {
    return "Your cart is empty.";
  }
  const items = [];
  for (const it of b.items) {
    if (!it || typeof it !== "object") return "Invalid cart item.";
    const i = it as Record<string, unknown>;
    if (typeof i.slug !== "string" || typeof i.color !== "string" || typeof i.quantity !== "number") {
      return "Invalid cart item.";
    }
    items.push({ slug: i.slug.slice(0, 200), color: i.color.slice(0, 60), quantity: i.quantity });
  }
  return { name, email, phone, items };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = parseInput(raw);
  if (typeof input === "string") {
    return NextResponse.json({ error: input }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const { authorizationUrl, reference } = await createCheckout(
      input,
      new URL(request.url).origin,
      user?.id ?? null
    );
    return NextResponse.json({ authorizationUrl, reference });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("checkout failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
