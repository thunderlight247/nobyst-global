import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory, seedProduct } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: (_name: string, value: string) => {
      state.cookie = value;
    },
    delete: () => {},
  }),
}));

import { createSession, hashPassword, updateUserAccess } from "@/lib/auth";
import { listActivity, logActivity } from "@/lib/activity";
import { beginSetup, confirmSetup } from "@/lib/two-factor";
import { hotp, stepAt } from "@/lib/totp";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as verify2fa } from "@/app/api/auth/two-factor/verify/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { PATCH as editProduct } from "@/app/api/admin/products/[id]/route";

const PASSWORD = "Sup3r-secret-pass";
const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://shop.test/x", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "41.66.1.2", "user-agent": "TestBrowser/1.0", ...headers },
    body: JSON.stringify(body),
  });
const sha = async (t: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))), (b) => b.toString(16).padStart(2, "0")).join("");

async function account(id: string, email: string, role = "customer") {
  await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, 'N', ?, ?)")
    .bind(id, email, await hashPassword(PASSWORD), role)
    .run();
}

beforeEach(async () => {
  vi.unstubAllGlobals();
  state.env = createTestEnv({
    PAYSTACK_SECRET_KEY: "sk_test_x",
    TOTP_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(5))),
  });
  state.cookie = undefined;
  await seedCategory(state.env);
});

describe("security log", () => {
  it("records sign-ins and failed attempts with where they came from, never the password", async () => {
    await account("u", "u@example.com");
    await login(json({ email: "u@example.com", password: "wrong-guess-1" }));
    await login(json({ email: "nobody@example.com", password: "wrong-guess-2" }));
    await login(json({ email: "u@example.com", password: PASSWORD }));
    const log = await listActivity({ category: "security" });
    expect(log.map((e) => e.action).sort()).toEqual(["auth.login", "auth.login_failed", "auth.login_failed"]);
    expect(log.every((e) => e.ip === "41.66.1.2")).toBe(true);
    const all = JSON.stringify(log);
    for (const secret of [PASSWORD, "wrong-guess-1", "wrong-guess-2"]) expect(all).not.toContain(secret);
  });

  it("records lockouts", async () => {
    await account("u", "u@example.com");
    for (let i = 0; i < 9; i++) await login(json({ email: "u@example.com", password: "nope-nope" }));
    expect((await listActivity()).some((e) => e.action === "auth.lockout")).toBe(true);
  });

  it("records wrong 2FA codes and recovery-code sign-ins", async () => {
    await account("p", "p@example.com", "partner");
    const token = await createSession("p");
    const { secret } = (await beginSetup({ id: "p", email: "p@example.com" }))!;
    const codes = (await confirmSetup("p", await hotp(secret, stepAt(Date.now())), await sha(token)))!;
    state.cookie = await createSession("p");
    await verify2fa(json({ code: "000000" }));
    await verify2fa(json({ code: codes[0] }));
    const actions = (await listActivity({ category: "security" })).map((e) => e.action);
    expect(actions).toContain("2fa.failed");
    expect(actions).toContain("2fa.recovery_used");
    expect(JSON.stringify(await listActivity())).not.toContain(codes[0]);
  });

  it("records role and partner-status changes with who made them", async () => {
    await account("o", "o@example.com", "owner");
    await account("c", "c@example.com");
    await updateUserAccess({ id: "o", role: "owner", email: "o@example.com" }, "c", "partner", "C Ltd", "pending");
    const [entry] = await listActivity({ category: "security" });
    expect(entry.summary).toBe("o@example.com changed c@example.com: role customer → partner, partner status none → pending");
  });

  it("records admin price changes on NOBYST's own products", async () => {
    await account("a", "a@example.com", "admin");
    await state.env.DB.prepare("INSERT INTO user_totp (user_id, secret_ciphertext, enabled_at) VALUES ('a', 'x', datetime('now'))").run();
    state.cookie = await createSession("a");
    await state.env.DB.prepare("UPDATE sessions SET mfa_verified_at = datetime('now')").run();
    await seedProduct(state.env, { id: "p1", price: 4000 });
    const body = {
      name: "Product p1", category: "Audio", description: "A test product", features: ["x"], image: "/images/x.jpg",
      imageAlt: "alt", fits: ["iphone-usbc"], price: "35", stockStatus: "in_stock",
    };
    expect((await editProduct(new Request("https://shop.test/x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "p1" }) })).status).toBe(200);
    const [entry] = await listActivity({ category: "admin" });
    expect(entry.summary).toContain("price GH₵40.00 → GH₵35.00");
  });

  it("removes entries older than 12 months", async () => {
    await state.env.DB.prepare("INSERT INTO activity_log (id, at, action, summary) VALUES ('old', datetime('now', '-13 months'), 'auth.login', 'old')").run();
    await state.env.DB.prepare("INSERT INTO activity_log (id, at, action, summary) VALUES ('recent', datetime('now', '-11 months'), 'auth.login', 'recent')").run();
    vi.spyOn(Math, "random").mockReturnValue(0);
    await logActivity({ actor: null, action: "auth.login", summary: "now" });
    vi.restoreAllMocks();
    expect((await listActivity()).map((e) => e.id)).not.toContain("old");
    expect((await listActivity()).map((e) => e.summary)).toContain("recent");
  });
});

describe("shopping needs an account only to pay", () => {
  const order = {
    name: "Kofi",
    email: "k@example.com",
    phone: "0240000000",
    delivery: { method: "pickup" },
    items: [{ slug: "p1", color: "", quantity: 1 }],
  };

  it("refuses checkout for guests", async () => {
    await seedProduct(state.env, { id: "p1" });
    const res = await checkout(json(order));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/sign in or create an account/i) });
  });

  it("lets a newly registered customer pay", async () => {
    await seedProduct(state.env, { id: "p1" });
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ status: true, data: { authorization_url: "https://pay.test/x" } })));
    expect((await signup(json({ name: "Kofi Mensah", email: "k@example.com", password: PASSWORD }))).status).toBe(200);
    // Paying needs a confirmed email.
    expect((await checkout(json(order))).status).toBe(403);
    await state.env.DB.prepare("UPDATE users SET email_verified_at = datetime('now')").run();
    const res = await checkout(json(order));
    expect(await res.json()).toMatchObject({ authorizationUrl: "https://pay.test/x" });
  });
});
