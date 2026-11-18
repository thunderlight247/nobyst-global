import { NextResponse } from "next/server";
import { createEnquiry, type EnquiryType } from "@/lib/enquiries";
import { adminInbox, escapeHtml, publicOrigin, sendEmail } from "@/lib/email";
import { site } from "@/data/site";
import { clientIp, hit, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string capped at `max` characters, or null when blank. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim().slice(0, max);
  return s || null;
}

export async function POST(request: Request) {
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
      company: text(body.company, 120),
    });

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
<p><a href="${origin}/admin/enquiries">Review it in the admin</a> and choose <em>Invite as partner</em> to send them a portal invitation.</p>`
      );
    }

    // Acknowledge the customer, at most a few times per address per hour, so the form cannot be
    // used to flood someone else's inbox. The email deliberately does not quote the submitted
    // message: echoing visitor text to an arbitrary address would turn the site into a spam relay.
    // A mail failure never fails the saved enquiry.
    if (await hit(`enquiry:email:${email.toLowerCase()}`, LIMITS.enquiryEmail)) {
      await sendEmail(
        enquiry.email,
        "We received your message - NOBYST GLOBAL",
        `<p>Hello,</p>
<p>Thank you for getting in touch with NOBYST GLOBAL. We have received your message and will reply to this email address as soon as we can.</p>
<p>For anything urgent, email <a href="mailto:${site.email}">${site.email}</a>.</p>
<p>If you did not contact us, you can ignore this email.</p>`
      );
    }

    return NextResponse.json({ ok: true, id: enquiry.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to capture enquiry:", error);
    return NextResponse.json({ error: "Could not save enquiry." }, { status: 500 });
  }
}
