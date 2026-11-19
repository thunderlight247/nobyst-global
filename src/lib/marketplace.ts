import { getEnv } from "./cloudflare";
import { adminInbox, escapeHtml, sendEmail } from "./email";
import { logActivity, type Actor } from "./activity";
import type { CurrentUser } from "./auth";
import type { Product, ProductStatus } from "./products";

/**
 * Marketplace rules shared by the partner and admin routes. See docs/MARKETPLACE_PLAN.md.
 */

export function actorOf(user: CurrentUser): Actor {
  return { id: user.id, email: user.email, role: user.role };
}

export function partnerLabel(user: { company: string | null; email: string }): string {
  return user.company ?? user.email;
}

/** Status a partner's new or edited product gets: live for trusted partners, otherwise review. */
export function statusAfterPartnerSave(user: CurrentUser, current: ProductStatus | null): ProductStatus {
  if (current === "hidden") return "hidden"; // the partner hid it; editing keeps it hidden
  // An admin rejected it: even a trusted partner's fix goes back to the admin for review.
  if (current === "rejected") return "pending";
  return user.partnerStatus === "trusted" ? "live" : "pending";
}

/** Tells the team a pending partner submitted something to review. Never fails the save. */
export async function notifyReviewNeeded(user: CurrentUser, product: Product, origin: string): Promise<void> {
  await sendEmail(
    await adminInbox(),
    `Product to review: ${product.name} (${partnerLabel(user)})`,
    `<p><strong>${escapeHtml(partnerLabel(user))}</strong> submitted <strong>${escapeHtml(product.name)}</strong> for the shop.</p>
<p>It stays hidden until you approve it. <a href="${origin}/admin/approvals">Review it in the admin</a>.</p>`
  );
}

/** Emails a partner the outcome of a review. */
export async function notifyPartnerOfReview(
  product: Product,
  status: ProductStatus,
  note: string | null,
  origin: string
): Promise<void> {
  if (!product.partnerId) return;
  const { DB } = await getEnv();
  const partner = await DB.prepare("SELECT email, company FROM users WHERE id = ?")
    .bind(product.partnerId)
    .first<{ email: string; company: string | null }>();
  if (!partner) return;
  const live = status === "live";
  await sendEmail(
    partner.email,
    live ? `${product.name} is now live on nobyst.com` : `${product.name} needs changes before it can go live`,
    `<p>Dear ${escapeHtml(partner.company ?? "partner")},</p>
<p>${
      live
        ? `Good news: <strong>${escapeHtml(product.name)}</strong> has been approved and is now in the shop.`
        : `We could not publish <strong>${escapeHtml(product.name)}</strong> yet.`
    }</p>
${note ? `<p><strong>Note from our team:</strong> ${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : ""}
<p><a href="${origin}/partner">Open your partner dashboard</a></p>
<p>The NOBYST GLOBAL team</p>`
  );
}

export async function logPartnerProduct(
  user: CurrentUser,
  action: string,
  product: { id: string; name: string },
  detail: string
): Promise<void> {
  await logActivity({
    actor: actorOf(user),
    partnerId: user.id,
    action,
    entityId: product.id,
    summary: `${partnerLabel(user)} ${detail} “${product.name}”`,
  });
}

export type CategoryRequest = {
  id: string;
  partnerId: string;
  partnerName: string;
  name: string;
  parentId: string | null;
  note: string | null;
  status: "pending" | "approved" | "declined";
  decidedNote: string | null;
  createdAt: string;
};

type CategoryRequestRow = {
  id: string;
  partner_id: string;
  partner_name: string | null;
  partner_email: string | null;
  name: string;
  parent_id: string | null;
  note: string | null;
  status: string;
  decided_note: string | null;
  created_at: string;
};

function mapRequest(r: CategoryRequestRow): CategoryRequest {
  return {
    id: r.id,
    partnerId: r.partner_id,
    partnerName: r.partner_name ?? r.partner_email ?? "Partner",
    name: r.name,
    parentId: r.parent_id,
    note: r.note,
    status: r.status === "approved" || r.status === "declined" ? r.status : "pending",
    decidedNote: r.decided_note,
    createdAt: r.created_at,
  };
}

/** Category requests, newest first: one partner's own, or everyone's for the admin. */
export async function listCategoryRequests(partnerId?: string): Promise<CategoryRequest[]> {
  try {
    const { DB } = await getEnv();
    const sql = `SELECT r.*, u.company AS partner_name, u.email AS partner_email FROM category_requests r
                 LEFT JOIN users u ON u.id = r.partner_id ${partnerId ? "WHERE r.partner_id = ?" : ""}
                 ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200`;
    const stmt = DB.prepare(sql);
    const { results } = await (partnerId ? stmt.bind(partnerId) : stmt).all<CategoryRequestRow>();
    return results.map(mapRequest);
  } catch (err) {
    console.warn("Could not load category requests (run migration 0016?)", err);
    return [];
  }
}

export async function createCategoryRequest(
  user: CurrentUser,
  input: { name: string; parentId: string | null; note: string | null }
): Promise<CategoryRequest> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  await DB.prepare("INSERT INTO category_requests (id, partner_id, name, parent_id, note) VALUES (?, ?, ?, ?, ?)")
    .bind(id, user.id, input.name, input.parentId, input.note)
    .run();
  await logActivity({
    actor: actorOf(user),
    partnerId: user.id,
    action: "category.request",
    entityId: id,
    summary: `${partnerLabel(user)} asked for a new category “${input.name}”`,
  });
  const [request] = (await listCategoryRequests(user.id)).filter((r) => r.id === id);
  return request;
}

/** Records an admin's decision on a request (the caller creates the category on approval). */
export async function decideCategoryRequest(
  admin: CurrentUser,
  id: string,
  decision: "approved" | "declined",
  note: string | null,
  origin: string
): Promise<CategoryRequest | null> {
  const { DB } = await getEnv();
  const res = await DB.prepare(
    "UPDATE category_requests SET status = ?, decided_note = ?, decided_at = datetime('now') WHERE id = ? AND status = 'pending'"
  )
    .bind(decision, note, id)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return null;
  const [request] = (await listCategoryRequests()).filter((r) => r.id === id);
  if (!request) return null;
  await logActivity({
    actor: actorOf(admin),
    partnerId: request.partnerId,
    action: `category.${decision === "approved" ? "approve" : "decline"}`,
    entityId: id,
    summary: `${admin.email} ${decision} the category “${request.name}” requested by ${request.partnerName}`,
  });
  const partner = await DB.prepare("SELECT email, company FROM users WHERE id = ?")
    .bind(request.partnerId)
    .first<{ email: string; company: string | null }>();
  if (partner) {
    await sendEmail(
      partner.email,
      decision === "approved" ? `New category added: ${request.name}` : `About your category request: ${request.name}`,
      `<p>Dear ${escapeHtml(partner.company ?? "partner")},</p>
<p>${
        decision === "approved"
          ? `The category <strong>${escapeHtml(request.name)}</strong> is now available. You can file your products under it.`
          : `We have not added the category <strong>${escapeHtml(request.name)}</strong>.`
      }</p>
${note ? `<p><strong>Note from our team:</strong> ${escapeHtml(note)}</p>` : ""}
<p><a href="${origin}/partner">Open your partner dashboard</a></p>
<p>The NOBYST GLOBAL team</p>`
    );
  }
  return request;
}
