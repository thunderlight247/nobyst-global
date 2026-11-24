import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { createEnquiry, type EnquiryType } from "@/lib/enquiries";
import { adminInbox, escapeHtml, publicOrigin, sendEmail } from "@/lib/email";
import { site } from "@/data/site";
import { clientIp, hit, LIMITS, rateLimit } from "@/lib/rate-limit";
import { createInvitation, revokeInvitation, sendInvitationEmail } from "@/lib/invitations";
import { findUserByEmail, isStaff } from "@/lib/auth";
import { domainAcceptsMail } from "@/lib/email-check";
import { logActivity } from "@/lib/activity";
import { passesTurnstile, TURNSTILE_FAILED } from "@/lib/turnstile";

/**
 * Business names from the partner form are put into an email sent to the address the visitor
 * typed, so they must not be able to carry a link or a long message (that would let spammers send
 * mail through us). Letters, numbers, spaces and ordinary punctuation, at most 80 characters.
 */
function cleanBusinessName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 80) return null;
  if (/https?:|:\/\/|www\.|@|<|>/i.test(name)) return null;
  if (!/^[\p{L}\p{N} &'’.,()\-\/+]+$/u.test(name)) return null;
  return name;
}

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "POST, OPTIONS") });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string capped at `max` characters, or null when blank. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim().slice(0, max);
  return s || null;
}

export async function POST(request: Request) {
  const CORS = corsHeaders(request, "POST, OPTIONS");
  try {
    const limited = await rateLimit([[`enquiry:ip:${clientIp(request)}`, LIMITS.enquiryIp]]);
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const name = text(body.name, 120) ?? "";
    const email = text(body.email, 200) ?? "";
    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    const type = (["contact", "partnership", "bulk_order"].includes(body.type)
      ? body.type
      : "contact") as EnquiryType;

    if (name.length < 2) {
      return NextResponse.json({ error: "Please provide your name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }
    if (rawMessage.length < 5) {
      return NextResponse.json({ error: "Please write a message." }, { status: 400 });
    }
    if (rawMessage.length > 5000) {
      return NextResponse.json({ error: "Please keep your message under 5000 characters." }, { status: 400 });
    }
    const businessName = type === "partnership" ? cleanBusinessName(body.company) : null;
    // Partner applications send an email automatically, so they get the bot check.
    if (type === "partnership" && !(await passesTurnstile(request, body.turnstileToken))) {
      return NextResponse.json({ error: TURNSTILE_FAILED, turnstile: true }, { status: 400, headers: CORS });
    }
    if (type === "partnership" && !businessName) {
      return NextResponse.json(
        { error: "Please enter your business name (letters, numbers and simple punctuation, no web links)." },
        { status: 400 }
      );
    }
    const quantity =
      typeof body.quantity === "number" && Number.isInteger(body.quantity) && body.quantity > 0 && body.quantity <= 1_000_000
        ? body.quantity
        : null;

    const enquiry = await createEnquiry({
      type,
      name,
      email,
      phone: text(body.phone, 40),
      topic: text(body.topic, 120),
      message: rawMessage,
      productName: text(body.productName, 160),
      quantity,
      company: businessName ?? text(body.company, 120),
    });

    // Partner applications get their invitation straight away, unless that email already belongs
    // to a partner or staff account, or its domain cannot receive mail. It is capped per address
    // like the acknowledgement below, so the form cannot flood anyone's inbox.
    let autoInvite: "sent" | "existing" | "undeliverable" | "skipped" = "skipped";
    if (type === "partnership" && businessName && (await hit(`enquiry:email:${email.toLowerCase()}`, LIMITS.enquiryEmail))) {
      const existing = await findUserByEmail(email).catch(() => null);
      if (existing && (existing.role === "partner" || isStaff(existing.role))) {
        autoInvite = "existing";
      } else if (!(await domainAcceptsMail(email))) {
        autoInvite = "undeliverable";
      } else {
        const { invitation, token } = await createInvitation({
          email,
          name,
          company: businessName,
          enquiryId: enquiry.id,
          invitedBy: null,
          source: "application",
          trusted: false,
          markContacted: false,
        });
        if (await sendInvitationEmail(invitation, token, await publicOrigin(request))) {
          autoInvite = "sent";
          await logActivity({
            actor: null,
            actorEmail: email,
            action: "invite.sent_auto",
            entityId: invitation.id,
            summary: `Invitation emailed automatically to ${businessName} (${email}) after their application`,
            request,
          });
        } else {
          await revokeInvitation(invitation.id);
          autoInvite = "undeliverable";
        }
      }
    }

    // Tell the team about partnership applications, with a link straight to the enquiry where
    // they can send a partner invitation. Visitor text is escaped; this goes only to our inbox.
    if (type === "partnership") {
      const origin = await publicOrigin(request);
      await sendEmail(
        await adminInbox(),
        `New partner application: ${enquiry.company ?? enquiry.name}`,
        `<p><strong>${escapeHtml(enquiry.name)}</strong> (${escapeHtml(enquiry.email)}) applied to partner with NOBYST GLOBAL.</p>
<p><strong>Organisation:</strong> ${escapeHtml(enquiry.company ?? "Not given")}<br>
<strong>Category:</strong> ${escapeHtml(enquiry.topic ?? "Not given")}</p>
<blockquote style="margin:12px 0;padding-left:12px;border-left:3px solid #ddd;color:#555">${escapeHtml(enquiry.message).replace(/\n/g, "<br>")}</blockquote>
<p>${
          autoInvite === "sent"
            ? "An invitation to set up their partner account was emailed to them automatically. Their products will wait for your approval until you mark them trusted."
            : autoInvite === "existing"
            ? "This email already belongs to a partner or staff account, so no new invitation was sent."
            : autoInvite === "undeliverable"
            ? "<strong>No invitation was sent:</strong> their email address cannot receive mail. Check it and invite them from the admin."
            : "No automatic invitation was sent (too many recent applications from this address)."
        }</p>
<p><a href="${origin}/admin/enquiries">Review it in the admin</a>.</p>`
      );
    }

    // Acknowledge the customer, at most a few times per address per hour, so the form cannot be
    // used to flood someone else's inbox. The email deliberately does not quote the submitted
    // message: echoing visitor text to an arbitrary address would turn the site into a spam relay.
    // A mail failure never fails the saved enquiry.
    // Partner applications already got their invitation (or were rate limited above).
    if (type !== "partnership" && (await hit(`enquiry:email:${email.toLowerCase()}`, LIMITS.enquiryEmail))) {
      await sendEmail(
        enquiry.email,
        "We received your message - NOBYST GLOBAL",
        `<p>Hello,</p>
<p>Thank you for getting in touch with NOBYST GLOBAL. We have received your message and will reply to this email address as soon as we can.</p>
<p>For anything urgent, email <a href="mailto:${site.email}">${site.email}</a>.</p>
<p>If you did not contact us, you can ignore this email.</p>`
      );
    }

    return NextResponse.json({ ok: true, id: enquiry.id, invitationSent: autoInvite === "sent" }, { status: 201, headers: CORS });
  } catch (error) {
    console.error("Failed to capture enquiry:", error);
    return NextResponse.json({ error: "Could not save enquiry." }, { status: 500, headers: CORS });
  }
}
