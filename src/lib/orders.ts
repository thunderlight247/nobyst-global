import { formatPrice } from "./catalogue";
import { getEnv } from "./cloudflare";
import { describeDelivery, fulfilmentLabel, type DeliveryDetails, type FulfilmentStatus } from "./delivery";
import { escapeHtml, sendEmail } from "./email";
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
  delivery: DeliveryDetails;
  items: CheckoutItemInput[];
};

export class CheckoutError extends Error {}

/** Starts a Paystack transaction for an order already saved as pending. */
async function initializePayment(input: {
  orderId: string;
  reference: string;
  email: string;
  amountPesewas: number;
  origin: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const env = await getEnv();
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas, // Paystack takes the smallest unit: pesewas for GHS
      currency: "GHS",
      reference: input.reference,
      callback_url: `${input.origin}/checkout/verify`,
      metadata: { order_id: input.orderId, ...input.metadata },
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  } | null;

  if (!res.ok || !body?.status || !body.data?.authorization_url) {
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(input.orderId).run();
    throw new CheckoutError(body?.message ?? "Could not start payment. Please try again.");
  }
  await env.DB.prepare("UPDATE orders SET payment_url = ? WHERE id = ?")
    .bind(body.data.authorization_url, input.orderId)
    .run();
  return body.data.authorization_url;
}

function newReference(orderId: string): string {
  return `NBG-${Date.now().toString(36)}-${orderId.slice(0, 8)}`.toUpperCase();
}

/**
 * Builds a pending order from prices stored in D1, then starts a Paystack
 * transaction. The browser never supplies a price: totals come from the database.
 */
export async function createCheckout(
  input: CheckoutInput,
  origin: string,
  userId: string | null = null
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
    partnerId: string | null;
    commissionBps: number | null;
  }[] = [];
  const commissions = new Map<string, number>();

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new CheckoutError("Please choose a quantity between 1 and 50.");
    }
    const product = await getProductBySlug(item.slug);
    if (!product) throw new CheckoutError("A product in your cart is no longer available.");
    if (product.stockStatus === "out_of_stock") {
      throw new CheckoutError(`${product.name} is out of stock. Remove it from your cart to continue.`);
    }
    if (product.pricePesewas === null || product.pricePesewas <= 0) {
      throw new CheckoutError(`${product.name} is priced on request. Please contact us to order it.`);
    }
    // Partner lines remember NOBYST's commission rate at the moment of sale.
    let commissionBps: number | null = null;
    if (product.partnerId) {
      if (!commissions.has(product.partnerId)) {
        const row = await env.DB.prepare("SELECT commission_bps FROM users WHERE id = ?")
          .bind(product.partnerId)
          .first<{ commission_bps: number | null }>();
        commissions.set(product.partnerId, row?.commission_bps ?? 1000);
      }
      commissionBps = commissions.get(product.partnerId)!;
    }
    lines.push({
      slug: product.slug,
      name: product.name,
      color: item.color,
      quantity: item.quantity,
      unitPesewas: product.pricePesewas,
      partnerId: product.partnerId,
      commissionBps,
    });
  }

  const totalPesewas = lines.reduce((sum, l) => sum + l.unitPesewas * l.quantity, 0);
  const orderId = crypto.randomUUID();
  const reference = newReference(orderId);
  const d = input.delivery;

  await env.DB.prepare(
    `INSERT INTO orders (id, reference, status, email, name, phone, total_pesewas, currency, user_id,
       delivery_method, delivery_region, delivery_town, delivery_address, delivery_notes)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, 'GHS', ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      orderId,
      reference,
      input.email,
      input.name,
      input.phone,
      totalPesewas,
      userId,
      d.method,
      d.region,
      d.town,
      d.address,
      d.notes
    )
    .run();

  for (const l of lines) {
    await env.DB.prepare(
      `INSERT INTO order_items (id, order_id, product_slug, product_name, color, quantity, unit_pesewas, partner_id, commission_bps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), orderId, l.slug, l.name, l.color, l.quantity, l.unitPesewas, l.partnerId, l.commissionBps)
      .run();
  }

  const authorizationUrl = await initializePayment({
    orderId,
    reference,
    email: input.email,
    amountPesewas: totalPesewas,
    origin,
    metadata: { customer_name: input.name, phone: input.phone },
  });
  return { authorizationUrl, reference };
}

export type OrderSummary = {
  id: string;
  reference: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  totalPesewas: number;
  createdAt: string;
  paidAt: string | null;
  fulfilmentStatus: FulfilmentStatus;
  fulfilmentUpdatedAt: string | null;
  delivery: {
    method: string | null;
    region: string | null;
    town: string | null;
    address: string | null;
    notes: string | null;
  };
  enquiryId: string | null;
  paymentUrl: string | null;
  items: {
    productName: string;
    color: string;
    quantity: number;
    unitPesewas: number;
    /** Seller's business name for partner lines; null for NOBYST's own. */
    partnerName?: string | null;
    /** Delivery status of a partner line, updated by the partner. */
    fulfilmentStatus?: string | null;
  }[];
};

/** @deprecated Kept for existing imports; every order list now returns OrderSummary. */
export type PaidOrder = OrderSummary;

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  total_pesewas: number;
  created_at: string;
  paid_at: string | null;
  fulfilment_status: string | null;
  fulfilment_updated_at: string | null;
  delivery_method: string | null;
  delivery_region: string | null;
  delivery_town: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  enquiry_id: string | null;
  payment_url: string | null;
};

/** Loads orders matching `where` with their line items. `where` is a fixed SQL fragment. */
async function queryOrders(where: string, binds: unknown[], order: string, limit: number): Promise<OrderSummary[]> {
  const { DB } = await getEnv();
  const { results: orders } = await DB.prepare(
    `SELECT * FROM orders WHERE ${where} ORDER BY ${order} LIMIT ${limit}`
  )
    .bind(...binds)
    .all<OrderRow>();
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { results: rows } = await DB.prepare(
    `SELECT oi.*, u.company AS partner_name FROM order_items oi LEFT JOIN users u ON u.id = oi.partner_id
     WHERE oi.order_id IN (${ids.map(() => "?").join(",")})`
  )
    .bind(...ids)
    .all<{
      order_id: string;
      product_name: string;
      color: string;
      quantity: number;
      unit_pesewas: number;
      partner_id?: string | null;
      partner_name?: string | null;
      fulfilment_status?: string | null;
    }>();

  const byOrder = new Map<string, OrderSummary["items"]>();
  for (const r of rows) {
    const list = byOrder.get(r.order_id) ?? [];
    list.push({
      productName: r.product_name,
      color: r.color,
      quantity: r.quantity,
      unitPesewas: r.unit_pesewas,
      partnerName: r.partner_id ? r.partner_name ?? "Partner" : null,
      fulfilmentStatus: r.partner_id ? r.fulfilment_status ?? "new" : null,
    });
    byOrder.set(r.order_id, list);
  }

  return orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    name: o.name,
    email: o.email,
    phone: o.phone,
    totalPesewas: o.total_pesewas,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    fulfilmentStatus: (o.fulfilment_status ?? "new") as FulfilmentStatus,
    fulfilmentUpdatedAt: o.fulfilment_updated_at ?? null,
    delivery: {
      method: o.delivery_method ?? null,
      region: o.delivery_region ?? null,
      town: o.delivery_town ?? null,
      address: o.delivery_address ?? null,
      notes: o.delivery_notes ?? null,
    },
    enquiryId: o.enquiry_id ?? null,
    paymentUrl: o.payment_url ?? null,
    items: byOrder.get(o.id) ?? [],
  }));
}

/** Paid orders only, newest first, each with its line items. */
export async function listPaidOrders(): Promise<OrderSummary[]> {
  return queryOrders("status = 'paid'", [], "paid_at DESC", 200);
}

/**
 * Orders started in the last 14 days that are not confirmed paid. A payment can succeed at
 * Paystack while the customer never returns to the site, so the admin can re-check these.
 */
export async function listUnconfirmedOrders(): Promise<OrderSummary[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().replace("T", " ").slice(0, 19);
  return queryOrders("status IN ('pending', 'failed') AND created_at >= ?", [since], "created_at DESC", 100);
}

/** Paid orders placed while signed in as this user, newest first. */
export async function listOrdersForUser(userId: string): Promise<OrderSummary[]> {
  return queryOrders("status = 'paid' AND user_id = ?", [userId], "paid_at DESC", 100);
}

/** Unpaid partner quotes for this user, so the partner portal can show "Pay now". */
export async function listOpenQuotesForUser(userId: string): Promise<OrderSummary[]> {
  return queryOrders(
    "status = 'pending' AND enquiry_id IS NOT NULL AND user_id = ?",
    [userId],
    "created_at DESC",
    50
  );
}

/**
 * Confirms a transaction with Paystack and marks the matching order as paid.
 * Only Paystack's verify response is trusted; the redirect query string and webhook body are not.
 */
export async function verifyCheckout(reference: string): Promise<"paid" | "failed" | "pending" | "not_found"> {
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

  const paystackStatus = body?.data?.status;
  // Confirm the amount and currency match what we stored, not just the status.
  const paid =
    paystackStatus === "success" &&
    body!.data!.amount === order.total_pesewas &&
    body!.data!.currency === "GHS";

  // Still open at Paystack (customer has not finished, or a partner has not paid a quote yet):
  // leave it pending so a later webhook or re-check can still confirm it.
  if (!paid && (!res.ok || paystackStatus === "ongoing" || paystackStatus === "pending" || paystackStatus === "abandoned" || !paystackStatus)) {
    return "pending";
  }

  // Only the request that flips the order to paid sends the confirmation, so a repeat verify
  // (redirect, webhook and admin re-check can all race) does not email twice.
  const update = await env.DB.prepare(
    "UPDATE orders SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END WHERE id = ? AND status != 'paid'"
  )
    .bind(paid ? "paid" : "failed", paid ? "paid" : "failed", order.id)
    .run();

  if (paid && (update.meta?.changes ?? 0) > 0) await sendOrderConfirmation(order.id);

  return paid ? "paid" : "failed";
}

async function loadOrder(orderId: string): Promise<OrderSummary | null> {
  const [order] = await queryOrders("id = ?", [orderId], "created_at DESC", 1);
  return order ?? null;
}

function itemRows(order: OrderSummary): string {
  return order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.productName)}${i.color ? ` (${escapeHtml(i.color)})` : ""} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${escapeHtml(formatPrice(i.unitPesewas * i.quantity) ?? "")}</td></tr>`
    )
    .join("");
}

async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order) return;

  await sendEmail(
    order.email,
    `Order confirmed: ${order.reference}`,
    `<p>Hello ${escapeHtml(order.name)},</p>
<p>Thank you for your order. We have received your payment.</p>
<p><strong>Order reference:</strong> ${escapeHtml(order.reference)}<br>
<strong>${order.delivery.method === "pickup" ? "Collection" : "Delivery"}:</strong> ${escapeHtml(describeDelivery(order.delivery))}</p>
<table style="width:100%;border-collapse:collapse">${itemRows(order)}
<tr><td style="padding-top:10px;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding-top:10px;border-top:1px solid #ddd;text-align:right"><strong>${escapeHtml(formatPrice(order.totalPesewas) ?? "")}</strong></td></tr></table>
<p>We will call ${escapeHtml(order.phone)} to arrange ${order.delivery.method === "pickup" ? "collection" : "delivery"}. Keep this reference for any questions about your order.</p>`
  );
}

/** Statuses that are worth an email to the customer when the team moves an order there. */
const NOTIFY_STATUSES: FulfilmentStatus[] = ["dispatched", "ready", "delivered", "cancelled"];

/** Moves a paid order along. Returns the updated order, or null if it is not a paid order. */
export async function updateFulfilment(orderId: string, status: FulfilmentStatus): Promise<OrderSummary | null> {
  const { DB } = await getEnv();
  const res = await DB.prepare(
    "UPDATE orders SET fulfilment_status = ?, fulfilment_updated_at = datetime('now') WHERE id = ? AND status = 'paid' AND fulfilment_status != ?"
  )
    .bind(status, orderId, status)
    .run();
  const order = await loadOrder(orderId);
  if (!order || order.status !== "paid") return null;

  if ((res.meta?.changes ?? 0) > 0 && NOTIFY_STATUSES.includes(status)) {
    const message: Record<string, string> = {
      dispatched: "Your order is on its way. We will call you if the courier needs directions.",
      ready: "Your order is ready to collect from our Techiman location. Bring your order reference.",
      delivered: "Your order is complete. Thank you for shopping with NOBYST GLOBAL.",
      cancelled: "Your order has been cancelled. If you have paid, we will contact you about your refund.",
    };
    await sendEmail(
      order.email,
      `Order ${order.reference}: ${fulfilmentLabel(status)}`,
      `<p>Hello ${escapeHtml(order.name)},</p>
<p>${message[status]}</p>
<p><strong>Order reference:</strong> ${escapeHtml(order.reference)}</p>
<table style="width:100%;border-collapse:collapse">${itemRows(order)}</table>`
    );
  }
  return order;
}

/**
 * Turns a partner's bulk request into a priced order and emails them a Paystack payment link.
 * The admin sets the unit price and quantity; the order belongs to the partner's account.
 */
export async function createPartnerQuote(input: {
  enquiryId: string;
  unitPesewas: number;
  quantity: number;
  note: string | null;
  origin: string;
}): Promise<OrderSummary> {
  const env = await getEnv();
  if (!env.PAYSTACK_SECRET_KEY) throw new CheckoutError("Online payment is not configured yet.");

  const enquiry = await env.DB.prepare(
    `SELECT e.id, e.user_id, e.product_name, e.phone, u.email, u.name, u.company
     FROM enquiries e JOIN users u ON u.id = e.user_id
     WHERE e.id = ? AND u.role IN ('partner', 'admin', 'owner')`
  )
    .bind(input.enquiryId)
    .first<{ id: string; user_id: string; product_name: string | null; phone: string | null; email: string; name: string; company: string | null }>();
  if (!enquiry) throw new CheckoutError("Quotes can only be sent for requests from a partner account.");

  const open = await env.DB.prepare(
    "SELECT reference FROM orders WHERE enquiry_id = ? AND status = 'pending'"
  )
    .bind(enquiry.id)
    .first<{ reference: string }>();
  if (open) {
    // Replace the earlier quote so only one payment link is live per request.
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE enquiry_id = ? AND status = 'pending'")
      .bind(enquiry.id)
      .run();
  }

  const product = enquiry.product_name
    ? await env.DB.prepare("SELECT slug FROM products WHERE name = ?").bind(enquiry.product_name).first<{ slug: string }>()
    : null;
  const totalPesewas = input.unitPesewas * input.quantity;
  const orderId = crypto.randomUUID();
  const reference = newReference(orderId);

  await env.DB.prepare(
    `INSERT INTO orders (id, reference, status, email, name, phone, total_pesewas, currency, user_id,
       delivery_method, delivery_notes, enquiry_id)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, 'GHS', ?, 'arranged', ?, ?)`
  )
    .bind(
      orderId,
      reference,
      enquiry.email,
      enquiry.company ?? enquiry.name,
      enquiry.phone ?? "",
      totalPesewas,
      enquiry.user_id,
      input.note,
      enquiry.id
    )
    .run();
  await env.DB.prepare(
    `INSERT INTO order_items (id, order_id, product_slug, product_name, color, quantity, unit_pesewas)
     VALUES (?, ?, ?, ?, '', ?, ?)`
  )
    .bind(crypto.randomUUID(), orderId, product?.slug ?? "", enquiry.product_name ?? "Bulk order", input.quantity, input.unitPesewas)
    .run();

  const paymentUrl = await initializePayment({
    orderId,
    reference,
    email: enquiry.email,
    amountPesewas: totalPesewas,
    origin: input.origin,
    metadata: { partner: enquiry.company ?? enquiry.name, enquiry_id: enquiry.id },
  });

  await env.DB.prepare("UPDATE enquiries SET status = 'contacted' WHERE id = ? AND status = 'new'")
    .bind(enquiry.id)
    .run();

  const order = (await loadOrder(orderId))!;
  await sendEmail(
    enquiry.email,
    `Your quote ${reference} from NOBYST GLOBAL`,
    `<p>Hello ${escapeHtml(enquiry.name)},</p>
<p>Here is our quote for your bulk request${enquiry.company ? ` for <strong>${escapeHtml(enquiry.company)}</strong>` : ""}.</p>
<table style="width:100%;border-collapse:collapse">${itemRows(order)}
<tr><td style="padding-top:10px;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding-top:10px;border-top:1px solid #ddd;text-align:right"><strong>${escapeHtml(formatPrice(totalPesewas) ?? "")}</strong></td></tr></table>
${input.note ? `<p>${escapeHtml(input.note).replace(/\n/g, "<br>")}</p>` : ""}
<p><a href="${paymentUrl}" style="display:inline-block;padding:10px 18px;background:#0B1F4B;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">Pay securely with Paystack</a></p>
<p>You can also pay from your partner portal. Reference: ${escapeHtml(reference)}.</p>`
  );
  return order;
}
