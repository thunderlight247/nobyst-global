import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listEnquiries } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const enquiries = await listEnquiries();
  return NextResponse.json({ enquiries });
}
