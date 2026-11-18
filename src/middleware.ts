import { NextResponse, type NextRequest } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF protection for the JSON API. Browsers always send an Origin header on cross-site
 * POST/PUT/PATCH/DELETE, so a write whose Origin is a different host came from another site
 * (for example a hidden form posting text/plain JSON) and is refused. Same-origin fetches and
 * non-browser clients without an Origin are unaffected. Session cookies are SameSite=Lax as a
 * second layer.
 */
export function middleware(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  } else if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
