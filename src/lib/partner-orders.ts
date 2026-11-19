import { getEnv } from "./cloudflare";
import { escapeHtml, sendEmail } from "./email";
import { formatPrice } from "./catalogue";
import { describeDelivery, fulfilmentLabel, type FulfilmentStatus } from "./delivery";
import { logActivity } from "./activity";
import { actorOf, partnerLabel } from "./marketplace";
import type { CurrentUser } from "./auth";

/**
 * Partner orders and money. A partner only ever sees their own order lines and the customer
 * details needed to deliver them (name, phone, address), never other lines or payment details.
 */

export type PartnerOrderItem = {
  id: string;
  orderReference: string;
  paidAt: string | null;
  productName: string;
  color: string;
  quantity: number;
  unitPesewas: number;
  commissionBps: number;
  fulfilmentStatus: FulfilmentStatus;
  customer: { name: string; phone: string };
  delivery: { method: string | null; region: string | null; town: string | null; address: string | null; notes: string | null };
};

type ItemRow = {
  id: string;
  reference: string;
  paid_at: string | null;
  product_name: string;
  color: string;
  quantity: number;
  unit_pesewas: number;
  commission_bps: number | null;
  fulfilment_status: string | null;
  name: string;
  phone: string;
  delivery_method: string | null;
  delivery_region: string | null;
  delivery_town: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
};

const ITEM_SELECT = `SELECT oi.id, o.reference, o.paid_at, oi.product_name, oi.color, oi.quantity, oi.unit_pesewas,
    oi.commission_bps, oi.fulfilment_status, o.name, o.phone, o.delivery_method, o.delivery_region,
    o.delivery_town, o.delivery_address, o.delivery_notes
  FROM order_items oi JOIN orders o ON o.id = oi.order_id`;

function mapItem(r: ItemRow): PartnerOrderItem {
  return {
    id: r.id,
    orderReference: r.reference,
    paidAt: r.paid_at,
    productName: r.product_name,
    color: r.color,
    quantity: r.quantity,
    unitPesewas: r.unit_pesewas,
    commissionBps: r.commission_bps ?? 0,
    fulfilmentStatus: (r.fulfilment_status ?? "new") as FulfilmentStatus,
    customer: { name: r.name, phone: r.phone },
    delivery: {
      method: r.delivery_method,
      region: r.delivery_region,
      town: r.delivery_town,
      address: r.delivery_address,
      notes: r.delivery_notes,
    },
  };
}

/** Paid order lines for this partner's products, newest first. */
export async function listPartnerOrderItems(partnerId: string): Promise<PartnerOrderItem[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      `${ITEM_SELECT} WHERE oi.partner_id = ? AND o.status = 'paid' ORDER BY o.paid_at DESC LIMIT 300`
    )
      .bind(partnerId)
      .all<ItemRow>();
    return results.map(mapItem);
  } catch (err) {
    console.warn("Could not load partner orders (run migration 0016?)", err);
    return [];
  }
}

const NOTIFY: FulfilmentStatus[] = ["dispatched", "ready", "delivered", "cancelled"];

/**
 * A partner moves one of their own lines along. The WHERE clause carries the partner id, so a
 * partner can never touch another seller's line. The customer is emailed at key steps.
 */
export async function updatePartnerItem(
  user: CurrentUser,
  itemId: string,
  status: FulfilmentStatus
): Promise<PartnerOrderItem | null> {
  const { DB } = await getEnv();
  const res = await DB.prepare(
    `UPDATE order_items SET fulfilment_status = ?, fulfilment_updated_at = datetime('now')
     WHERE id = ? AND partner_id = ? AND fulfilment_status != ?
       AND order_id IN (SELECT id FROM orders WHERE status = 'paid')`
  )
    .bind(status, itemId, user.id, status)
    .run();
  const row = await DB.prepare(`${ITEM_SELECT} WHERE oi.id = ? AND oi.partner_id = ? AND o.status = 'paid'`)
    .bind(itemId, user.id)
    .first<ItemRow>();
  if (!row) return null;
  const item = mapItem(row);
  if ((res.meta?.changes ?? 0) === 0) return item;

  await logActivity({
    actor: actorOf(user),
    partnerId: user.id,
    action: "order.status",
    entityId: itemId,
    summary: `${partnerLabel(user)} marked ${item.quantity} × “${item.productName}” (order ${item.orderReference}) ${fulfilmentLabel(status, "admin").toLowerCase()}`,
  });
  if (NOTIFY.includes(status)) {
    const email = await DB.prepare("SELECT o.email FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = ?")
      .bind(itemId)
      .first<{ email: string }>();
    if (email) {
      const message: Record<string, string> = {
        dispatched: "is on its way",
        ready: "is ready to collect",
        delivered: "has been delivered",
        cancelled: "has been cancelled. If you have paid, NOBYST GLOBAL will contact you about your refund",
      };
      await sendEmail(
        email.email,
        `Order ${item.orderReference}: ${item.productName} ${fulfilmentLabel(status).toLowerCase()}`,
        `<p>Hello ${escapeHtml(item.customer.name)},</p>
<p>Your ${item.quantity} × <strong>${escapeHtml(item.productName)}</strong> from ${escapeHtml(partnerLabel(user))} ${message[status]}.</p>
<p><strong>Order reference:</strong> ${escapeHtml(item.orderReference)}<br>
<strong>${item.delivery.method === "pickup" ? "Collection" : "Delivery"}:</strong> ${escapeHtml(describeDelivery(item.delivery))}</p>
<p>Questions? Reply to this email or contact <a href="mailto:info@nobyst.com">info@nobyst.com</a>.</p>`
      );
    }
  }
  return item;
}

export type Earnings = {
  /** Sales of lines not cancelled, before commission. */
  grossPesewas: number;
  commissionPesewas: number;
  /** Net of commission, for delivered lines: what NOBYST owes once paid out. */
  earnedPesewas: number;
  /** Net of commission, for lines not yet delivered. */
  pendingPesewas: number;
  paidOutPesewas: number;
  owedPesewas: number;
};

export type Payout = {
  id: string;
  amountPesewas: number;
  method: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

/** Totals for one partner, worked out from the order lines and payouts. */
export async function partnerEarnings(partnerId: string): Promise<Earnings> {
  const { DB } = await getEnv();
  const empty: Earnings = { grossPesewas: 0, commissionPesewas: 0, earnedPesewas: 0, pendingPesewas: 0, paidOutPesewas: 0, owedPesewas: 0 };
  try {
    const sums = await DB.prepare(
      `SELECT
         COALESCE(SUM(oi.quantity * oi.unit_pesewas), 0) AS gross,
         COALESCE(SUM(oi.quantity * oi.unit_pesewas * COALESCE(oi.commission_bps, 0) / 10000), 0) AS commission,
         COALESCE(SUM(CASE WHEN oi.fulfilment_status = 'delivered'
           THEN oi.quantity * oi.unit_pesewas - oi.quantity * oi.unit_pesewas * COALESCE(oi.commission_bps, 0) / 10000 ELSE 0 END), 0) AS earned
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.partner_id = ? AND o.status = 'paid' AND oi.fulfilment_status != 'cancelled'`
    )
      .bind(partnerId)
      .first<{ gross: number; commission: number; earned: number }>();
    const paid = await DB.prepare("SELECT COALESCE(SUM(amount_pesewas), 0) AS paid FROM payouts WHERE partner_id = ?")
      .bind(partnerId)
      .first<{ paid: number }>();
    const gross = Math.round(sums?.gross ?? 0);
    const commission = Math.round(sums?.commission ?? 0);
    const earned = Math.round(sums?.earned ?? 0);
    const paidOut = paid?.paid ?? 0;
    return {
      grossPesewas: gross,
      commissionPesewas: commission,
      earnedPesewas: earned,
      pendingPesewas: gross - commission - earned,
      paidOutPesewas: paidOut,
      owedPesewas: earned - paidOut,
    };
  } catch (err) {
    console.warn("Could not work out partner earnings (run migration 0016?)", err);
    return empty;
  }
}

export async function listPayouts(partnerId: string): Promise<Payout[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      "SELECT id, amount_pesewas, method, reference, note, created_at FROM payouts WHERE partner_id = ? ORDER BY created_at DESC LIMIT 200"
    )
      .bind(partnerId)
      .all<{ id: string; amount_pesewas: number; method: string; reference: string | null; note: string | null; created_at: string }>();
    return results.map((r) => ({
      id: r.id,
      amountPesewas: r.amount_pesewas,
      method: r.method,
      reference: r.reference,
      note: r.note,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/** An admin records money paid to a partner. The partner is emailed. */
export async function recordPayout(
  admin: CurrentUser,
  partnerId: string,
  input: { amountPesewas: number; method: string; reference: string | null; note: string | null }
): Promise<Payout | null> {
  const { DB } = await getEnv();
  const partner = await DB.prepare("SELECT email, company FROM users WHERE id = ? AND role = 'partner'")
    .bind(partnerId)
    .first<{ email: string; company: string | null }>();
  if (!partner) return null;
  const id = crypto.randomUUID();
  await DB.prepare(
    "INSERT INTO payouts (id, partner_id, amount_pesewas, method, reference, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, partnerId, input.amountPesewas, input.method, input.reference, input.note, admin.id)
    .run();
  await logActivity({
    actor: actorOf(admin),
    partnerId,
    action: "payout.record",
    entityId: id,
    summary: `${admin.email} recorded a payout of ${formatPrice(input.amountPesewas)} to ${partner.company ?? partner.email} by ${input.method}${input.reference ? ` (ref ${input.reference})` : ""}`,
  });
  await sendEmail(
    partner.email,
    `Payout sent: ${formatPrice(input.amountPesewas)}`,
    `<p>Dear ${escapeHtml(partner.company ?? "partner")},</p>
<p>NOBYST GLOBAL has sent you <strong>${escapeHtml(formatPrice(input.amountPesewas) ?? "")}</strong> by ${escapeHtml(input.method)}${
      input.reference ? ` (reference ${escapeHtml(input.reference)})` : ""
    }.</p>
${input.note ? `<p>${escapeHtml(input.note)}</p>` : ""}
<p>You can see all your sales and payouts in your partner dashboard.</p>
<p>The NOBYST GLOBAL team</p>`
  );
  return (await listPayouts(partnerId)).find((p) => p.id === id) ?? null;
}

export type PartnerSummary = {
  id: string;
  email: string;
  company: string | null;
  partnerStatus: string | null;
  commissionBps: number;
  payoutDetails: string | null;
  products: { live: number; pending: number; total: number };
  earnings: Earnings;
};

/** Every partner with their product counts and money, for the admin Partners tab. */
export async function listPartnerSummaries(): Promise<PartnerSummary[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      `SELECT u.id, u.email, u.company, u.partner_status, u.commission_bps, u.payout_details,
         (SELECT COUNT(*) FROM products p WHERE p.partner_id = u.id) AS total,
         (SELECT COUNT(*) FROM products p WHERE p.partner_id = u.id AND p.status = 'live') AS live,
         (SELECT COUNT(*) FROM products p WHERE p.partner_id = u.id AND p.status = 'pending') AS pending
       FROM users u WHERE u.role = 'partner' ORDER BY u.company`
    ).all<{
      id: string;
      email: string;
      company: string | null;
      partner_status: string | null;
      commission_bps: number | null;
      payout_details: string | null;
      total: number;
      live: number;
      pending: number;
    }>();
    return Promise.all(
      results.map(async (r) => ({
        id: r.id,
        email: r.email,
        company: r.company,
        partnerStatus: r.partner_status,
        commissionBps: r.commission_bps ?? 1000,
        payoutDetails: r.payout_details,
        products: { live: r.live, pending: r.pending, total: r.total },
        earnings: await partnerEarnings(r.id),
      }))
    );
  } catch (err) {
    console.warn("Could not load partner summaries (run migration 0016?)", err);
    return [];
  }
}
