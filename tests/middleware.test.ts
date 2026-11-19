import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function req(method: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://shop.test/api/auth/login", {
    method,
    headers: { host: "shop.test", ...headers },
  });
}

describe("CSRF middleware", () => {
  it("refuses cross-site writes", () => {
    expect(middleware(req("POST", { origin: "https://evil.example" })).status).toBe(403);
    expect(middleware(req("DELETE", { origin: "https://shop.test.evil.example" })).status).toBe(403);
    expect(middleware(req("POST", { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(middleware(req("POST", { origin: "null" })).status).toBe(403);
  });

  it("allows same-origin writes, reads, and server-to-server calls without an Origin", () => {
    expect(middleware(req("POST", { origin: "https://shop.test" })).status).toBe(200);
    expect(middleware(req("GET", { origin: "https://evil.example" })).status).toBe(200);
    // Paystack's webhook is a server request with no Origin header.
    expect(middleware(req("POST")).status).toBe(200);
  });
});
