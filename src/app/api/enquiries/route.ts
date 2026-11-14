import { NextResponse } from "next/server";
import { createEnquiry, type EnquiryType } from "@/lib/enquiries";
import { escapeHtml, sendEmail } from "@/lib/email";
import { site } from "@/data/site";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const type = (["contact", "partnership", "bulk_order"].includes(body.type)
      ? body.type
      : "contact") as EnquiryType;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please provide your name." }, { status: 400 });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }
    if (!message || message.length < 5) {
      return NextResponse.json({ error: "Please write a message." }, { status: 400 });
    }

    const enquiry = await createEnquiry({
      type,
      name,
      email,
      phone: body.phone ? String(body.phone).trim() : null,
      topic: body.topic ? String(body.topic).trim() : null,
      message,
      productName: body.productName ? String(body.productName).trim() : null,
      quantity: typeof body.quantity === "number" ? body.quantity : null,
    });

    // Acknowledge the customer. A mail failure never fails the saved enquiry.
    await sendEmail(
      enquiry.email,
      "We received your message - NOBYST GLOBAL",
      `<p>Hello ${escapeHtml(enquiry.name)},</p>
<p>Thank you for getting in touch. We have received your message and will reply to this email address as soon as we can.</p>
<p>For anything urgent, email <a href="mailto:${site.email}">${site.email}</a>.</p>
<blockquote style="margin:12px 0;padding-left:12px;border-left:3px solid #ddd;color:#555">${escapeHtml(enquiry.message)}</blockquote>`
    );

    return NextResponse.json({ ok: true, id: enquiry.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to capture enquiry:", error);
    return NextResponse.json({ error: "Could not save enquiry." }, { status: 500 });
  }
}
