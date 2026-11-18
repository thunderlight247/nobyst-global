import { NextResponse } from "next/server";
import { listUsers, requireAdmin } from "@/lib/auth";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    console.error("Could not list users", error);
    return NextResponse.json({ error: "Could not load accounts." }, { status: 500 });
  }
}
