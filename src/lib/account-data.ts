import { getEnv } from "./cloudflare";
import { logActivity } from "./activity";
import type { CurrentUser } from "./auth";

/**
 * A customer's own data: download everything we hold about them, or delete the account.
 * Paid orders are kept for accounting and tax but stripped of personal details.
 */

export async function exportAccountData(user: CurrentUser): Promise<Record<string, unknown>> {
  const { DB } = await getEnv();
  const rows = async (sql: string, ...binds: unknown[]) =>
    (await DB.prepare(sql).bind(...binds).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] }))).results;

  const profile = await DB.prepare(
    "SELECT id, email, name, role, company, partner_status, created_at, email_verified_at, payout_details FROM users WHERE id = ?"
  )
    .bind(user.id)
    .first<Record<string, unknown>>()
    .catch(() => null);
  const orders = await rows(
    `SELECT id, reference, status, name, email, phone, total_pesewas, currency, created_at, paid_at, fulfilment_status,
            delivery_method, delivery_region, delivery_town, delivery_address, delivery_notes
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    user.id
  );
  for (const order of orders) {
    order.items = await rows(
      "SELECT product_name, color, quantity, unit_pesewas, fulfilment_status FROM order_items WHERE order_id = ?",
      order.id
    );
  }
  return {
    exportedAt: new Date().toISOString(),
    about: "Everything NOBYST GLOBAL LTD holds about your account. See https://nobyst.com/privacy.",
    profile,
    twoFactorEnabled: user.twoFactorEnabled,
    orders,
    enquiries: await rows(
      "SELECT type, name, email, phone, topic, message, product_name, quantity, status, created_at FROM enquiries WHERE user_id = ? OR lower(email) = ? ORDER BY created_at DESC",
      user.id,
      user.email.toLowerCase()
    ),
    partnerProducts: user.role === "partner" ? await rows("SELECT id, name, status, price_pesewas, created_at FROM products WHERE partner_id = ?", user.id) : [],
    payouts: user.role === "partner" ? await rows("SELECT amount_pesewas, method, reference, created_at FROM payouts WHERE partner_id = ?", user.id) : [],
    activity: await rows(
      "SELECT at, action, summary, ip FROM activity_log WHERE actor_id = ? AND at >= datetime('now', '-12 months') ORDER BY at DESC LIMIT 500",
      user.id
    ),
  };
}

/** Why an account cannot delete itself right now, or null when it can. */
export async function deletionBlocker(user: CurrentUser): Promise<string | null> {
  if (user.role !== "customer") {
    return "Partner and staff accounts are closed by our team (shop, payouts and records are involved). Email info@nobyst.com.";
  }
  const { DB } = await getEnv();
  const open = await DB.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'paid' AND fulfilment_status NOT IN ('delivered', 'cancelled')"
  )
    .bind(user.id)
    .first<{ n: number }>();
  if ((open?.n ?? 0) > 0) return "You have an order that is still on its way. You can delete your account once it is delivered.";
  return null;
}

/**
 * Deletes a customer's account: their sign-in and personal details go; their paid orders stay
 * (amounts and items, for accounting and tax) with name, email, phone and address removed.
 */
export async function deleteCustomerAccount(user: CurrentUser, request: Request): Promise<void> {
  const { DB } = await getEnv();
  const placeholder = `deleted-${user.id.slice(0, 8)}@deleted.invalid`;
  await DB.prepare(
    `UPDATE orders SET name = 'Deleted customer', email = ?, phone = '', delivery_address = NULL,
       delivery_town = NULL, delivery_notes = NULL, payment_url = NULL, user_id = NULL
     WHERE user_id = ?`
  )
    .bind(placeholder, user.id)
    .run();
  await DB.prepare("DELETE FROM enquiries WHERE user_id = ? OR lower(email) = ?").bind(user.id, user.email.toLowerCase()).run();
  // The security log keeps what happened, without who it was.
  await DB.prepare(
    "UPDATE activity_log SET actor_email = NULL, summary = replace(summary, ?, '[deleted user]') WHERE actor_id = ? OR instr(summary, ?) > 0"
  )
    .bind(user.email, user.id, user.email)
    .run()
    .catch(() => undefined);
  for (const table of ["sessions", "password_resets", "recovery_codes", "user_totp", "email_verifications"]) {
    await DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(user.id).run().catch(() => undefined);
  }
  await DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  await logActivity({ actor: null, action: "user.deleted", entityId: user.id, summary: "A customer deleted their account", request });
}
