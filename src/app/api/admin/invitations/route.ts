import { NextResponse } from "next/server";
import { requireAdmin, requireRole } from "@/lib/auth";
import { publicOrigin } from "@/lib/email";
import { createInvitation, listInvitations, revokeInvitation, sendInvitationEmail } from "@/lib/invitations";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { domainAcceptsMail, suggestEmail } from "@/lib/email-check";
import { requireRecentAuth } from "@/lib/reauth";
import { logActivity } from "@/lib/activity";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ invitations: await listInvitations() });
}

/** Creates a partner invitation and emails the single-use link to the invitee. */
export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;

  const limited = await rateLimit([[`invite:admin:${auth.user.id}`, LIMITS.inviteAdmin]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 120) : "";
  const enquiryId = typeof body.enquiryId === "string" && body.enquiryId ? body.enquiryId.slice(0, 64) : null;

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!(await domainAcceptsMail(email))) {
    const suggestion = suggestEmail(email);
    return NextResponse.json(
      {
        error: `${email} cannot receive email: that domain has no mail server.${suggestion ? ` Did you mean ${suggestion}?` : " Check the address."}`,
        suggestion,
      },
      { status: 400 }
    );
  }
  if (name.length < 2) return NextResponse.json({ error: "Enter the contact's name." }, { status: 400 });
  if (company.length < 2) return NextResponse.json({ error: "Enter the partner's company name." }, { status: 400 });

  const stale = await requireRecentAuth();
  if (stale) return stale;

  try {
    const { invitation, token } = await createInvitation({
      email,
      name,
      company,
      enquiryId,
      invitedBy: auth.user.id,
      source: "admin",
      trusted: body.trusted === true,
    });
    const origin = await publicOrigin(request);
    const sent = await sendInvitationEmail(invitation, token, origin);
    if (!sent && process.env.NODE_ENV === "development") {
      // Local development usually has no RESEND_API_KEY. Hand the link back so the flow can be
      // tried. Production builds never return the token; they must deliver it by email.
      const devLink = `${new URL(request.url).origin}/partner/invite?token=${encodeURIComponent(token)}`;
      return NextResponse.json({ invitation, devLink }, { status: 201 });
    }
    if (!sent) {
      // Do not leave a live link nobody received.
      await revokeInvitation(invitation.id);
      return NextResponse.json(
        { error: "The invitation email could not be sent. Check the email settings and try again." },
        { status: 502 }
      );
    }
    await logActivity({
      actor: { id: auth.user.id, email: auth.user.email, role: auth.user.role },
      action: "invite.sent",
      entityId: invitation.id,
      summary: `${auth.user.email} invited ${invitation.company} (${invitation.email})${invitation.trusted ? " as a trusted partner" : ""}`,
      request,
    });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Could not create invitation", error);
    return NextResponse.json({ error: "Could not create the invitation." }, { status: 500 });
  }
}
