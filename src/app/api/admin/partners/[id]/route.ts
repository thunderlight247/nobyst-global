import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { requireRecentAuth } from "@/lib/reauth";
import { logActivity } from "@/lib/activity";
import { actorOf } from "@/lib/marketplace";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Sets NOBYST's commission on a partner's future sales (past sales keep their recorded rate). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  const body = (await request.json().catch(() => null)) as { commissionPercent?: unknown } | null;
  const percent = Number(body?.commissionPercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 90 || Math.round(percent * 100) !== percent * 100) {
    return NextResponse.json({ error: "Commission must be between 0% and 90%, e.g. 10 or 12.5." }, { status: 400 });
  }
  const stale = await requireRecentAuth();
  if (stale) return stale;
  const { DB } = await getEnv();
  const partner = await DB.prepare("SELECT email, company, commission_bps FROM users WHERE id = ? AND role = 'partner'")
    .bind(id)
    .first<{ email: string; company: string | null; commission_bps: number }>();
  if (!partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  const bps = Math.round(percent * 100);
  await DB.prepare("UPDATE users SET commission_bps = ? WHERE id = ?").bind(bps, id).run();
  await logActivity({
    actor: actorOf(auth.user),
    partnerId: id,
    action: "partner.commission",
    summary: `${auth.user.email} changed ${partner.company ?? partner.email}'s commission from ${partner.commission_bps / 100}% to ${percent}%`,
  });
  return NextResponse.json({ commissionBps: bps });
}
