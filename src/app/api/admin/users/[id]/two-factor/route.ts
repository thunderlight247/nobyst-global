import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { removeTwoFactor } from "@/lib/two-factor";
import { requireRecentAuth } from "@/lib/reauth";

// Owner only. Used when someone has lost their phone and their recovery codes.
export const dynamic = "force-dynamic";

/** Removes an account's 2FA and signs it out everywhere; staff must set it up again next sign-in. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("owner");
  if ("denied" in auth) return auth.denied;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "Use one of your recovery codes, or ask another owner." }, { status: 400 });
  }
  const stale = await requireRecentAuth();
  if (stale) return stale;
  await removeTwoFactor(id);
  return NextResponse.json({ ok: true });
}
