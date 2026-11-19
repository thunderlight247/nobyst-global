import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { createPartnerRequest, listEnquiriesForUser } from "@/lib/enquiries";
import { listPartnerCatalogue } from "@/lib/wholesale";
import { adminInbox, escapeHtml, sendEmail } from "@/lib/email";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

// Trusted partner accounts only. Every query is scoped to the signed-in partner's own user id.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePartner({ trusted: true });
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({ requests: await listEnquiriesForUser(auth.user.id) });
}

export async function POST(request: Request) {
  const auth = await requirePartner({ trusted: true });
  if ("denied" in auth) return auth.denied;
  const { user } = auth;

  const limited = await rateLimit([[`partner:request:${user.id}`, LIMITS.partnerRequestUser]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // The product, its name and its minimum come from the database, never from the browser.
  const productId = typeof body.productId === "string" ? body.productId : "";
  const item = (await listPartnerCatalogue()).find((p) => p.id === productId);
  if (!item) return NextResponse.json({ error: "Choose a product from your price list." }, { status: 400 });

  const quantity = typeof body.quantity === "number" ? body.quantity : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < item.minQuantity || quantity > 1_000_000) {
    return NextResponse.json(
      { error: `Order at least ${item.minQuantity} units of ${item.name}.` },
      { status: 400 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) || null : null;

  try {
    const saved = await createPartnerRequest(user.id, {
      name: user.name,
      email: user.email,
      phone,
      topic: user.company ? `Partner: ${user.company}` : "Partner request",
      message: message || `Bulk order request for ${quantity} × ${item.name}.`,
      productName: item.name,
      quantity,
    });

    // Let the team know. A mail failure never fails the saved request.
    await sendEmail(
      await adminInbox(),
      `Partner request: ${quantity} × ${item.name}`,
      `<p><strong>${escapeHtml(user.company ?? user.name)}</strong> (${escapeHtml(user.email)}) sent a bulk order request from the partner portal.</p>
<p><strong>Product:</strong> ${escapeHtml(item.name)}<br><strong>Quantity:</strong> ${quantity}</p>
${message ? `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : ""}
<p>Review it in the admin under Enquiries.</p>`
    );

    return NextResponse.json({ request: saved }, { status: 201 });
  } catch (error) {
    console.error("Could not save partner request", error);
    return NextResponse.json({ error: "Could not send your request. Please try again." }, { status: 500 });
  }
}
