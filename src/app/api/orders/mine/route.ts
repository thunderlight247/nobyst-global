/**
 * GET /api/orders/mine
 * Returns the authenticated user's orders.
 * Accepts Authorization: Bearer <token> (mobile app) OR session cookie (web).
 */
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { listOrdersForUser } from "@/lib/orders";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

/**
 * The signed-in account's id, from the mobile app's Bearer token or the website cookie. Uses the
 * site's central session rules, so a session still waiting for its 2FA code is refused here too.
 */
async function resolveUserId(request: Request): Promise<string | null> {
  const user = await getUserFromRequest(request).catch(() => null);
  return user?.id ?? null;
}

export async function GET(request: Request) {
  const CORS = corsHeaders(request, "GET, OPTIONS");
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401, headers: CORS });
  }

  const orders = await listOrdersForUser(userId);

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalPesewas: o.totalPesewas,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        productName: i.productName,
        qty: i.quantity,
        pricePesewas: i.unitPesewas,
      })),
    })),
    { headers: CORS }
  );
}
