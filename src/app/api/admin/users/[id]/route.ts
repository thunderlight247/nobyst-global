import { NextResponse } from "next/server";
import { isRole, requireRole, updateUserAccess } from "@/lib/auth";
import { isPartnerStatus } from "@/lib/roles";
import { requireRecentAuth } from "@/lib/reauth";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (!isRole(body.role)) return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });

  const company = typeof body.company === "string" ? body.company.trim().slice(0, 120) || null : null;
  if (body.role === "partner" && !company) {
    return NextResponse.json({ error: "Enter the partner's company name." }, { status: 400 });
  }

  // Changing who can do what is risky: ask the admin to confirm it's them first.
  const stale = await requireRecentAuth();
  if (stale) return stale;

  try {
    // Owner rules (only owners manage admins; the last owner is protected) live in roles.ts.
    const partnerStatus = isPartnerStatus(body.partnerStatus) ? body.partnerStatus : null;
    const result = await updateUserAccess(auth.user, id, body.role, company, partnerStatus);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ user: result.user });
  } catch (error) {
    console.error("Could not update user", error);
    return NextResponse.json({ error: "Could not update the account." }, { status: 500 });
  }
}
