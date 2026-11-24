/**
 * CORS for the routes the mobile app uses. Native iOS/Android apps are not browsers and ignore
 * CORS entirely, so this only decides which *websites* may read these responses: nobyst.com
 * itself, and localhost for Expo web development. Any other site gets no CORS headers, so a
 * browser will not hand it the response. (Cross-site writes are refused separately by the
 * origin check in middleware.ts.)
 */
const ALLOWED = [/^https:\/\/(www\.)?nobyst\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/];

export function corsHeaders(request: Request, methods: string): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ALLOWED.some((re) => re.test(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = methods;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

/** Copies CORS headers onto a response built elsewhere (e.g. a rate-limit reply). */
export function withCors(response: Response, cors: Record<string, string>): Response {
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}
