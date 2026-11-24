import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory, seedProduct } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: (_n: string, v: string) => {
      state.cookie = v;
    },
    delete: () => {
      state.cookie = undefined;
    },
  }),
}));

import { createPasswordReset, createSession, getCurrentUser, hashPassword, resetPassword } from "@/lib/auth";
import { confirmEmail } from "@/lib/email-verification";
import { passesTurnstile } from "@/lib/turnstile";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as resend } from "@/app/api/auth/verify-email/route";
import { GET as exportData } from "@/app/api/account/export/route";
import { POST as deleteAccount } from "@/app/api/account/delete/route";

const sent: { to: string[]; subject: string; html: string }[] = [];
function stubNetwork(turnstileSuccess = true) {
  sent.length = 0;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("resend")) {
      sent.push(JSON.parse(String(init?.body)));
      return new Response("{}");
    }
    if (url.includes("turnstile")) return new Response(JSON.stringify({ success: turnstileSuccess }));
    return new Response("not stubbed", { status: 500 });
  });
}
const post = (body: unknown) =>
  new Request("https://shop.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const linkToken = (html: string) => decodeURIComponent(/token=([^"&]+)/.exec(html)![1]);

beforeEach(async () => {
  vi.unstubAllGlobals();
  state.env = createTestEnv({ RESEND_API_KEY: "re_x", EMAIL_FROM: "NOBYST <info@nobyst.com>" });
  state.cookie = undefined;
  await seedCategory(state.env);
  stubNetwork();
});

describe("email verification", () => {
  it("emails a link on sign-up, and the link confirms the account once", async () => {
    await signup(post({ name: "Kofi Mensah", email: "kofi@example.com", password: "pass-12345" }));
    expect((await getCurrentUser())?.emailVerified).toBe(false);
    const mail = sent.find((m) => m.subject.startsWith("Confirm your email"))!;
    const token = linkToken(mail.html);
    expect(await confirmEmail(token)).toMatchObject({ email: "kofi@example.com" });
    expect(await confirmEmail(token)).toBeNull();
    expect((await getCurrentUser())?.emailVerified).toBe(true);
  });

  it("lets a customer resend the link, a few times an hour", async () => {
    await signup(post({ name: "Kofi Mensah", email: "kofi@example.com", password: "pass-12345" }));
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await resend(post({}))).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("treats a used password-reset link as proof of the email", async () => {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('u', 'u@e.com', 'U', 'x')").run();
    await resetPassword(await createPasswordReset("u"), "new-password-1");
    const row = await state.env.DB.prepare("SELECT email_verified_at FROM users").first<{ email_verified_at: string | null }>();
    expect(row?.email_verified_at).not.toBeNull();
  });
});

describe("Turnstile", () => {
  it("is off until both keys are set", async () => {
    expect(await passesTurnstile(post({}), undefined)).toBe(true);
  });

  it("blocks sign-up without a valid check once set up", async () => {
    state.env.TURNSTILE_SITE_KEY = "site";
    state.env.TURNSTILE_SECRET_KEY = "secret";
    expect((await signup(post({ name: "Kofi Mensah", email: "k@example.com", password: "pass-12345" }))).status).toBe(400);
    stubNetwork(false);
    expect((await signup(post({ name: "Kofi Mensah", email: "k@example.com", password: "pass-12345", turnstileToken: "bad" }))).status).toBe(400);
    stubNetwork(true);
    expect((await signup(post({ name: "Kofi Mensah", email: "k@example.com", password: "pass-12345", turnstileToken: "good" }))).status).toBe(200);
  });
});

describe("your data", () => {
  async function customerWithOrder(fulfilment = "delivered") {
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('c', 'c@e.com', 'Kofi', ?)").bind(await hashPassword("pass-12345")).run();
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES ('o', 'o@e.com', 'Other', 'x')").run();
    await seedProduct(state.env, { id: "p1" });
    for (const [id, user] of [["o1", "c"], ["o2", "o"]]) {
      await state.env.DB.prepare(
        "INSERT INTO orders (id, reference, status, email, name, phone, total_pesewas, user_id, fulfilment_status, delivery_address) VALUES (?, ?, 'paid', ?, ?, '0240000000', 5000, ?, ?, 'Adum, Kumasi')"
      ).bind(id, `REF-${id}`, `${user}@e.com`, user, user, fulfilment).run();
    }
    state.cookie = await createSession("c");
  }

  it("exports only the signed-in customer's own data", async () => {
    await customerWithOrder();
    const res = await exportData(new Request("https://shop.test/api/account/export"));
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const data = (await res.json()) as { profile: { email: string }; orders: { reference: string }[] };
    expect(data.profile.email).toBe("c@e.com");
    expect(data.orders.map((o) => o.reference)).toEqual(["REF-o1"]);
    expect(JSON.stringify(data)).not.toContain("password_hash");
  });

  it("deletes the account but keeps the paid order without personal details", async () => {
    await customerWithOrder();
    expect((await deleteAccount(post({ password: "wrong", confirm: "DELETE" }))).status).toBe(400);
    expect((await deleteAccount(post({ password: "pass-12345", confirm: "nope" }))).status).toBe(400);
    expect((await deleteAccount(post({ password: "pass-12345", confirm: "DELETE" }))).status).toBe(200);
    expect(await state.env.DB.prepare("SELECT id FROM users WHERE id = 'c'").first()).toBeNull();
    const order = await state.env.DB.prepare("SELECT name, email, phone, delivery_address, user_id, total_pesewas FROM orders WHERE id = 'o1'").first();
    expect(order).toMatchObject({ name: "Deleted customer", phone: "", delivery_address: null, user_id: null, total_pesewas: 5000 });
    expect(JSON.stringify(order)).not.toContain("c@e.com");
    // Someone else's order is untouched.
    expect(await state.env.DB.prepare("SELECT name FROM orders WHERE id = 'o2'").first()).toEqual({ name: "o" });
  });

  it("waits until open orders are delivered, and never lets partners self-delete", async () => {
    await customerWithOrder("dispatched");
    expect((await deleteAccount(post({ password: "pass-12345", confirm: "DELETE" }))).status).toBe(409);
    await state.env.DB.prepare("UPDATE users SET role = 'partner', partner_status = 'trusted' WHERE id = 'c'").run();
    await state.env.DB.prepare("UPDATE orders SET fulfilment_status = 'delivered'").run();
    expect((await deleteAccount(post({ password: "pass-12345", confirm: "DELETE" }))).status).toBe(409);
  });
});
