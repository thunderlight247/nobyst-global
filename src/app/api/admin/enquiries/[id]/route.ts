import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteEnquiry, updateEnquiryStatus, type EnquiryStatus } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => null);
    const status = body?.status as EnquiryStatus;
    if (!["new", "contacted", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const ok = await updateEnquiryStatus(params.id, status);
    return NextResponse.json({ ok });
  } catch (err) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ok = await deleteEnquiry(params.id);
  return NextResponse.json({ ok });
}
