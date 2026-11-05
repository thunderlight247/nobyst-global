import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.name !== "string" || !/^\S+@\S+\.\S+$/.test(String(b.email)) || String(b.message ?? "").length < 20) {
    return NextResponse.json({ message: "Please complete all required fields." }, { status: 400 });
  }
  const hook = process.env.ENQUIRY_WEBHOOK_URL;
  if (!hook) {
    // Honest failure: nothing is delivered until a destination is configured.
    return NextResponse.json({ message: "Online delivery is not set up yet, so your message was not sent. Please email info@nobyst.com or message us on WhatsApp." }, { status: 501 });
  }
  const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  if (!r.ok) return NextResponse.json({ message: "Delivery failed. Please email info@nobyst.com." }, { status: 502 });
  return NextResponse.json({ message: "Thank you. We have received your enquiry." });
}
