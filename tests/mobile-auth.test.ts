import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined), set: () => {}, delete: () => {} }),
}));

import { createSession } from "@/lib/auth";
import { beginSetup, confirmSetup } from "@/lib/two-factor";
import { hotp, stepAt } from "@/lib/totp";
import { GET as myOrders } from "@/app/api/orders/mine/route";
import { POST as mobileCheckout } from "@/app/api/checkout/mobile/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as mobileLogin } from "@/app/api/auth/mobile/login/route";
import { GET as publicProducts } from "@/app/api/products/route";
import { hashPassword } from "@/lib/auth";
import { escapeHtml } from "@/lib/email";

const sha = async (t: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))), (b) => b.toString(16).padStart(2, "0")).join("");
const bearer = (token: string, method = "GET", body?: unknown) =>
  new Request("https://shop.test/x", {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(async () => {
  state.env = createTestEnv({ TOTP_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(9))) });
  state.cookie = undefined;
  await seedCategory(state.env);
});

describe("mobile API sign-in rules", () => {
  /** An account with 2FA on, and a new session that has passed the password but not the code. */
  async function pendingSession() {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role, partner_status) VALUES ('p', 'p@e.com', 'P', 'x', 'partner', 'trusted')").run();
    const first = await createSession("p");
    const { secret } = (await beginSetup({ id: "p", email: "p@e.com" }))!;
    await confirmSetup("p", await hotp(secret, stepAt(Date.now())), await sha(first));
    return createSession("p"); // e.g. a stolen password used on a new device
  }

  it("does not accept a session that still needs its 2FA code", async () => {
    const token = await pendingSession();
    expect((await myOrders(bearer(token))).status).toBe(401);
    expect((await mobileCheckout(bearer(token, "POST", {}))).status).toBe(401);
    state.cookie = token;
    expect((await myOrders(new Request("https://shop.test/x"))).status).toBe(401);
  });

  it("accepts a normal signed-in customer by Bearer token", async () => {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('c', 'c@e.com', 'C', 'x')").run();
    const token = await createSession("c");
    expect((await myOrders(bearer(token))).status).toBe(200);
  });

  it("rejects unknown or expired tokens", async () => {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('c', 'c@e.com', 'C', 'x')").run();
    const token = await createSession("c");
    expect((await myOrders(bearer("made-up-token"))).status).toBe(401);
    await state.env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect((await myOrders(bearer(token))).status).toBe(401);
  });
});

describe("mobile sign-in and sign-out", () => {
  const login = (email: string) =>
    mobileLogin(new Request("https://shop.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "pass-12345" }) }));

  it("revokes a Bearer token on sign-out, so it stops working everywhere", async () => {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('c', 'c@e.com', 'C', 'x')").run();
    const token = await createSession("c");
    expect((await myOrders(bearer(token))).status).toBe(200);
    await logout(bearer(token, "POST", {}));
    expect((await myOrders(bearer(token))).status).toBe(401);
  });

  it("gives tokens to customers only, and never to an account with 2FA on", async () => {
    const hash = await hashPassword("pass-12345");
    for (const [id, role] of [["c", "customer"], ["a", "admin"], ["t", "customer"]]) {
      await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, 'N', ?, ?)").bind(id, `${id}@e.com`, hash, role).run();
    }
    await state.env.DB.prepare("INSERT INTO user_totp (user_id, secret_ciphertext, enabled_at) VALUES ('t', 'x', datetime('now'))").run();
    expect((await login("c@e.com")).status).toBe(200);
    expect((await login("a@e.com")).status).toBe(403);
    const twoFactor = await login("t@e.com");
    expect(twoFactor.status).toBe(403);
    expect(await twoFactor.json()).not.toHaveProperty("token");
  });
});

describe("CORS", () => {
  const from = (origin?: string) =>
    publicProducts(new Request("https://shop.test/api/products", { headers: origin ? { origin } : {} }));

  it("lets nobyst.com and local Expo web read the API, and no other website", async () => {
    expect((await from("https://nobyst.com")).headers.get("access-control-allow-origin")).toBe("https://nobyst.com");
    expect((await from("http://localhost:8081")).headers.get("access-control-allow-origin")).toBe("http://localhost:8081");
    for (const origin of ["https://evil.example", "https://nobyst.com.evil.example", "http://nobyst.com"]) {
      expect((await from(origin)).headers.get("access-control-allow-origin")).toBeNull();
    }
    // Native apps send no Origin and still get their data.
    expect((await from()).status).toBe(200);
  });
});

describe("HTML escaping in emails", () => {
  it("escapes every character that can break out of text or attributes", () => {
    expect(escapeHtml(`<a href='x' onclick="y">&`)).toBe("&lt;a href=&#39;x&#39; onclick=&quot;y&quot;&gt;&amp;");
  });
});
