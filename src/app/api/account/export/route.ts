import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { exportAccountData } from "@/lib/account-data";
import { logActivity } from "@/lib/activity";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Downloads everything we hold about the signed-in account, as a JSON file. */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limited = await rateLimit([[`account:data:${user.id}`, LIMITS.accountDataUser]]);
  if (limited) return limited;
  const data = await exportAccountData(user);
  await logActivity({ actor: { id: user.id, email: user.email, role: user.role }, action: "user.export", entityId: user.id, summary: `${user.email} downloaded their account data`, request });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nobyst-account-data.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
