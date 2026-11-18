import { getEnv } from "./cloudflare";
import { normaliseEmail, randomToken, sha256Hex } from "./auth";
import { escapeHtml, sendEmail } from "./email";

const INVITE_DAYS = 7;

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Invitation = {
  id: string;
  email: string;
  name: string;
  company: string;
  enquiryId: string | null;
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
};

type InvitationRow = {
  id: string;
  email: string;
  name: string;
  company: string;
  enquiry_id: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

function statusOf(row: InvitationRow): InvitationStatus {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (row.expires_at <= new Date().toISOString()) return "expired";
  return "pending";
}

function mapRow(row: InvitationRow): Invitation {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    enquiryId: row.enquiry_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: statusOf(row),
  };
}

/**
 * Creates an invitation and returns it with the raw token for the email link. Any earlier
 * pending invitation for the same email is revoked, so only the newest link works.
 */
export async function createInvitation(input: {
  email: string;
  name: string;
  company: string;
  enquiryId: string | null;
  invitedBy: string;
}): Promise<{ invitation: Invitation; token: string }> {
  const { DB } = await getEnv();
  const email = normaliseEmail(input.email);
  const now = new Date();
  await DB.prepare(
    "UPDATE partner_invitations SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL"
  )
    .bind(now.toISOString(), email)
    .run();

  const id = crypto.randomUUID();
  const token = randomToken();
  const expires = new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString();
  await DB.prepare(
    `INSERT INTO partner_invitations (id, token_hash, email, name, company, enquiry_id, invited_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, await sha256Hex(token), email, input.name, input.company, input.enquiryId, input.invitedBy, expires)
    .run();

  // Inviting counts as replying to the enquiry.
  if (input.enquiryId) {
    await DB.prepare("UPDATE enquiries SET status = 'contacted' WHERE id = ? AND status = 'new'")
      .bind(input.enquiryId)
      .run();
  }

  const row = await DB.prepare("SELECT * FROM partner_invitations WHERE id = ?").bind(id).first<InvitationRow>();
  return { invitation: mapRow(row!), token };
}

/** Looks up an invitation by its raw link token, whatever its status. */
export async function findInvitation(token: string): Promise<Invitation | null> {
  if (!token || token.length > 200) return null;
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT * FROM partner_invitations WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .first<InvitationRow>();
  return row ? mapRow(row) : null;
}

/**
 * Marks the invitation used and makes the account a partner, in that order, so a link can only
 * ever be redeemed once even under concurrent requests. The account's email must match the
 * invitation. Admins keep their admin role and just gain the company name.
 */
export async function acceptInvitation(
  token: string,
  user: { id: string; email: string }
): Promise<{ ok: true; company: string } | { ok: false; error: string }> {
  const { DB } = await getEnv();
  const invitation = await findInvitation(token);
  if (!invitation || invitation.status !== "pending") {
    return { ok: false, error: "This invitation link is invalid, used or expired. Ask us for a new one." };
  }
  if (normaliseEmail(user.email) !== invitation.email) {
    return { ok: false, error: `This invitation is for ${invitation.email}. Sign in with that email.` };
  }

  const now = new Date().toISOString();
  const claimed = await DB.prepare(
    `UPDATE partner_invitations SET accepted_at = ?, accepted_user_id = ?
     WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?
     RETURNING company`
  )
    .bind(now, user.id, await sha256Hex(token), now)
    .first<{ company: string }>();
  if (!claimed) {
    return { ok: false, error: "This invitation link is invalid, used or expired. Ask us for a new one." };
  }

  await DB.prepare(
    "UPDATE users SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'partner' END, company = ? WHERE id = ?"
  )
    .bind(claimed.company, user.id)
    .run();
  return { ok: true, company: claimed.company };
}

export async function listInvitations(): Promise<Invitation[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      "SELECT * FROM partner_invitations ORDER BY created_at DESC LIMIT 100"
    ).all<InvitationRow>();
    return results.map(mapRow);
  } catch (err) {
    console.warn("Could not load invitations (run migration 0010?)", err);
    return [];
  }
}

export async function revokeInvitation(id: string): Promise<boolean> {
  const { DB } = await getEnv();
  const res = await DB.prepare(
    "UPDATE partner_invitations SET revoked_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL"
  )
    .bind(new Date().toISOString(), id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Emails the invitation link. Returns false if the mail provider refused it. */
export async function sendInvitationEmail(invitation: Invitation, token: string, origin: string): Promise<boolean> {
  const link = `${origin}/partner/invite?token=${encodeURIComponent(token)}`;
  return sendEmail(
    invitation.email,
    "Your NOBYST GLOBAL partner portal invitation",
    `<p>Hello ${escapeHtml(invitation.name)},</p>
<p>Thank you for your interest in partnering with NOBYST GLOBAL. We have set up partner access for
<strong>${escapeHtml(invitation.company)}</strong>.</p>
<p>Use the link below to create your sign-in and open your partner portal, where you can see wholesale
prices and send bulk order requests.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0B1F4B;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">Open my partner invitation</a></p>
<p>The link works once and expires in ${INVITE_DAYS} days. If you were not expecting this, you can ignore this email.</p>`
  );
}
