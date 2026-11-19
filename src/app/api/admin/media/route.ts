import { NextResponse } from "next/server";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storeUpload } from "@/lib/media-upload";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const user = await getCurrentUser();
  const limited = await rateLimit([[`upload:user:${user?.id}`, LIMITS.uploadUser]]);
  if (limited) return limited;
  return storeUpload(request, "products/");
}
