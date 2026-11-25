import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storeUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

/**
 * A partner's photo or 3D model upload. It gets a random public name like any other upload; the
 * private register records that this partner owns it, which is what lets them use it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const limited = await rateLimit([[`upload:user:${auth.user.id}`, LIMITS.uploadUser]]);
  if (limited) return limited;
  return storeUpload(request, { id: auth.user.id, email: auth.user.email, role: auth.user.role });
}
