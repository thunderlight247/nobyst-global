import { NextResponse } from "next/server";
import { isRole, requireRole, updateUserAccess } from "@/lib/auth";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (!isRole(body.role)) return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });
  // An admin cannot change their own role, so the last admin can never lock everyone out.
  if (params.id === auth.user.id && body.role !== auth.user.role) {
    return NextResponse.json(
      { error: "You cannot change your own role. Ask another admin." },
      { status: 400 }
    );
  }

  const company = typeof body.company === "string" ? body.company.trim().slice(0, 120) || null : null;
  if (body.role === "partner" && !company) {
    return NextResponse.json({ error: "Enter the partner's company name." }, { status: 400 });
  }

  try {
    const user = await updateUserAccess(params.id, body.role, company);
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Could not update user", error);
    return NextResponse.json({ error: "Could not update the account." }, { status: 500 });
  }
}
