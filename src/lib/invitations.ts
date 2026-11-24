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
  /** "application": sent automatically from the partner form; "admin": sent by an admin. */
  source: "application" | "admin";
  /** The partner becomes trusted (no product approval) as soon as they accept. */
  trusted: boolean;
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
  source?: string | null;
  trusted?: number | null;
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
    source: row.source === "application" ? "application" : "admin",
    trusted: Boolean(row.trusted),
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
  /** The admin who sent it, or null for an automatic invitation from the partner form. */
  invitedBy: string | null;
  source?: "application" | "admin";
  trusted?: boolean;
  /** Mark the linked enquiry as contacted (admin invitations). Automatic ones leave it "new". */
  markContacted?: boolean;
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
    `INSERT INTO partner_invitations (id, token_hash, email, name, company, enquiry_id, invited_by, expires_at, source, trusted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      await sha256Hex(token),
      email,
      input.name,
      input.company,
      input.enquiryId,
      input.invitedBy,
      expires,
      input.source ?? "admin",
      input.trusted ? 1 : 0
    )
    .run();

  // An admin inviting counts as replying to the enquiry.
  if (input.enquiryId && input.markContacted !== false) {
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
 * invitation. Admins and owners keep their role and just gain the company name.
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
     RETURNING company, trusted`
  )
    .bind(now, user.id, await sha256Hex(token), now)
    .first<{ company: string; trusted: number }>();
  if (!claimed) {
    return { ok: false, error: "This invitation link is invalid, used or expired. Ask us for a new one." };
  }

  await DB.prepare(
    `UPDATE users SET
       role = CASE WHEN role IN ('admin', 'owner') THEN role ELSE 'partner' END,
       company = ?,
       -- An already-trusted partner stays trusted; otherwise the invitation decides.
       partner_status = CASE WHEN partner_status = 'trusted' OR ? = 1 THEN 'trusted' ELSE 'pending' END
     WHERE id = ?`
  )
    .bind(claimed.company, claimed.trusted ? 1 : 0, user.id)
    .run();
  // The invitation link was emailed to this address, so it is confirmed.
  await DB.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?")
    .bind(user.id)
    .run()
    .catch(() => undefined);
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
  const company = escapeHtml(invitation.company);
  const opening =
    invitation.source === "application"
      ? `Thank you for applying to partner with NOBYST GLOBAL LTD. We are delighted that <strong>${company}</strong> has chosen to bring its business online with us.`
      : `We are pleased to invite <strong>${company}</strong> to partner with NOBYST GLOBAL LTD and bring your business online with us.`;
  return sendEmail(
    invitation.email,
    `Welcome to NOBYST GLOBAL, ${invitation.company}: set up your partner account`,
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0B1F4B;max-width:560px">
<p>Dear ${company},</p>
<p>${opening}</p>
<p>Your partner account gives you one place to:</p>
<ul style="padding-left:20px;margin:0 0 12px">
  <li>list your products on <a href="${origin}" style="color:#1D4ED8">nobyst.com</a>, with photos, prices and stock;</li>
  <li>receive and manage orders from customers across Ghana;</li>
  <li>follow your sales and payouts.</li>
</ul>
<p>To get started, create your sign-in with the button below.${
      invitation.trusted
        ? ""
        : " Our team reviews each new partner's first products before they appear in the shop, usually within one working day."
    }</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#0B1F4B;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:bold">Set up my partner account</a></p>
<p style="font-size:13px;color:#555">This link is personal to ${escapeHtml(invitation.email)}, works once and expires in ${INVITE_DAYS} days. If you did not ${
      invitation.source === "application" ? "apply" : "expect this invitation"
    }, you can safely ignore this email.</p>
<p>We look forward to working with you.</p>
<p>Warm regards,<br><strong>The NOBYST GLOBAL team</strong><br>Techiman, Bono East Region, Ghana<br><a href="mailto:info@nobyst.com" style="color:#1D4ED8">info@nobyst.com</a></p>
</div>`
  );
}
