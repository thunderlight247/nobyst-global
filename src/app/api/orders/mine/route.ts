/**
 * GET /api/orders/mine
 * Returns the authenticated user's orders.
 * Accepts Authorization: Bearer <token> (mobile app) OR session cookie (web).
 */
import { NextResponse } from "next/server";
import { listOrdersForUser } from "@/lib/orders";
import { getEnv } from "@/lib/cloudflare";
import { sha256Hex, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function resolveUserId(request: Request): Promise<string | null> {
  const { DB } = await getEnv();
  const now = new Date().toISOString();

  // 1. Try Bearer token (mobile app)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const tokenHash = await sha256Hex(token);
    const row = await DB.prepare(
      "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?"
    )
      .bind(tokenHash, now)
      .first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  // 2. Fall back to cookie session (web)
  const jar = await cookies();
  const cookieToken = jar.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    const tokenHash = await sha256Hex(cookieToken);
    const row = await DB.prepare(
      "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?"
    )
      .bind(tokenHash, now)
      .first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  return null;
}

export async function GET(request: Request) {
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
