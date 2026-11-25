import { NextResponse } from "next/server";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { listMediaUploads, storeUpload } from "@/lib/media-upload";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** The private register of uploads: original names and uploaders, for admins only. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ uploads: await listMediaUploads() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const user = (await getCurrentUser())!;
  const limited = await rateLimit([[`upload:user:${user.id}`, LIMITS.uploadUser]]);
  if (limited) return limited;
  return storeUpload(request, { id: user.id, email: user.email, role: user.role });
}
