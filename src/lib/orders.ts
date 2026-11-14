import { getEnv } from "./cloudflare";
import { getProductBySlug } from "./products";

const PAYSTACK_API = "https://api.paystack.co";

export type CheckoutItemInput = {
  slug: string;
  color: string;
  quantity: number;
};

export type CheckoutInput = {
  name: string;
  email: string;
  phone: string;
  items: CheckoutItemInput[];
};

export class CheckoutError extends Error {}

/**
 * Builds a pending order from prices stored in D1, then starts a Paystack
 * transaction. The browser never supplies a price: totals come from the database.
 */
export async function createCheckout(
  input: CheckoutInput,
  origin: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const env = await getEnv();
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new CheckoutError("Online payment is not configured yet.");
  }
  if (input.items.length === 0) throw new CheckoutError("Your cart is empty.");

  const lines: {
    slug: string;
    name: string;
    color: string;
    quantity: number;
    unitPesewas: number;
  }[] = [];

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new CheckoutError("Please choose a quantity between 1 and 50.");
    }
    const product = await getProductBySlug(item.slug);
    if (!product) throw new CheckoutError("A product in your cart is no longer available.");
    if (product.pricePesewas === null || product.pricePesewas <= 0) {
      throw new CheckoutError(`${product.name} is priced on request. Please contact us to order it.`);
    }
    lines.push({
      slug: product.slug,
      name: product.name,
      color: item.color,
      quantity: item.quantity,
      unitPesewas: product.pricePesewas,
    });
  }

  const totalPesewas = lines.reduce((sum, l) => sum + l.unitPesewas * l.quantity, 0);
  const orderId = crypto.randomUUID();
  const reference = `NBG-${Date.now().toString(36)}-${orderId.slice(0, 8)}`.toUpperCase();

  await env.DB.prepare(
    `INSERT INTO orders (id, reference, status, email, name, phone, total_pesewas, currency)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, 'GHS')`
  )
    .bind(orderId, reference, input.email, input.name, input.phone, totalPesewas)
    .run();

  for (const l of lines) {
    await env.DB.prepare(
      `INSERT INTO order_items (id, order_id, product_slug, product_name, color, quantity, unit_pesewas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), orderId, l.slug, l.name, l.color, l.quantity, l.unitPesewas)
      .run();
  }

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: totalPesewas, // Paystack takes the smallest unit: pesewas for GHS
      currency: "GHS",
      reference,
      callback_url: `${origin}/checkout/verify`,
      metadata: { order_id: orderId, customer_name: input.name, phone: input.phone },
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  } | null;

  if (!res.ok || !body?.status || !body.data?.authorization_url) {
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(orderId).run();
    throw new CheckoutError(body?.message ?? "Could not start payment. Please try again.");
  }

  return { authorizationUrl: body.data.authorization_url, reference };
}

export type PaidOrder = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  totalPesewas: number;
  paidAt: string | null;
  items: { productName: string; color: string; quantity: number; unitPesewas: number }[];
};

/** Paid orders only, newest first, each with its line items. */
export async function listPaidOrders(): Promise<PaidOrder[]> {
  const { DB } = await getEnv();
  const { results: orders } = await DB.prepare(
    "SELECT id, reference, name, email, phone, total_pesewas, paid_at FROM orders WHERE status = 'paid' ORDER BY paid_at DESC LIMIT 200"
  ).all<{
    id: string;
    reference: string;
    name: string;
    email: string;
    phone: string;
    total_pesewas: number;
    paid_at: string | null;
  }>();
  if (orders.length === 0) return [];

  const { results: rows } = await DB.prepare(
    "SELECT order_id, product_name, color, quantity, unit_pesewas FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'paid' ORDER BY paid_at DESC LIMIT 200)"
  ).all<{
    order_id: string;
    product_name: string;
    color: string;
    quantity: number;
    unit_pesewas: number;
  }>();

  const byOrder = new Map<string, PaidOrder["items"]>();
  for (const r of rows) {
    const list = byOrder.get(r.order_id) ?? [];
    list.push({
      productName: r.product_name,
      color: r.color,
      quantity: r.quantity,
      unitPesewas: r.unit_pesewas,
    });
    byOrder.set(r.order_id, list);
  }

  return orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    name: o.name,
    email: o.email,
    phone: o.phone,
    totalPesewas: o.total_pesewas,
    paidAt: o.paid_at,
    items: byOrder.get(o.id) ?? [],
  }));
}

/**
 * Confirms a transaction with Paystack and marks the matching order as paid.
 * Only Paystack's verify response is trusted; the redirect query string is not.
 */
export async function verifyCheckout(reference: string): Promise<"paid" | "failed" | "not_found"> {
  const env = await getEnv();
  if (!env.PAYSTACK_SECRET_KEY) throw new CheckoutError("Online payment is not configured yet.");

  const order = await env.DB.prepare("SELECT id, status, total_pesewas FROM orders WHERE reference = ?")
    .bind(reference)
    .first<{ id: string; status: string; total_pesewas: number }>();
  if (!order) return "not_found";
  if (order.status === "paid") return "paid";

  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const body = (await res.json().catch(() => null)) as {
    data?: { status?: string; amount?: number; currency?: string };
  } | null;

  // Confirm the amount and currency match what we stored, not just the status.
  const paid =
    body?.data?.status === "success" &&
    body.data.amount === order.total_pesewas &&
    body.data.currency === "GHS";

  await env.DB.prepare("UPDATE orders SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END WHERE id = ?")
    .bind(paid ? "paid" : "failed", paid ? "paid" : "failed", order.id)
    .run();

  return paid ? "paid" : "failed";
}
