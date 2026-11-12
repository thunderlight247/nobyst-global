import { NextResponse } from "next/server";
import { listEnquiries } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export async function GET() {
  const enquiries = await listEnquiries();
  return NextResponse.json({ enquiries });
}
