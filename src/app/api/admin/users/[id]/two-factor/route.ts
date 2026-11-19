import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { removeTwoFactor } from "@/lib/two-factor";
import { logActivity } from "@/lib/activity";
import { getEnv } from "@/lib/cloudflare";
import { requireRecentAuth } from "@/lib/reauth";

// Owner only. Used when someone has lost their phone and their recovery codes.
export const dynamic = "force-dynamic";

/** Removes an account's 2FA and signs it out everywhere; staff must set it up again next sign-in. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("owner");
  if ("denied" in auth) return auth.denied;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "Use one of your recovery codes, or ask another owner." }, { status: 400 });
  }
  const stale = await requireRecentAuth();
  if (stale) return stale;
  const { DB } = await getEnv();
  const target = await DB.prepare("SELECT email FROM users WHERE id = ?").bind(id).first<{ email: string }>();
  await removeTwoFactor(id);
  await logActivity({ actor: { id: auth.user.id, email: auth.user.email, role: auth.user.role }, action: "2fa.reset", entityId: id, summary: `${auth.user.email} reset two-step sign-in for ${target?.email ?? id} (they were signed out)`, request });
  return NextResponse.json({ ok: true });
}
