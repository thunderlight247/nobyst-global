import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory, seedProduct, seedUser } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
// getCurrentUser reads cookies; these tests call the lower-level functions directly.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: () => {},
    delete: () => {},
  }),
}));

import { hit } from "@/lib/rate-limit";
import {
  createPasswordReset,
  createSession,
  getCurrentUser,
  hashPassword,
  resetPassword,
  updateUserAccess,
  verifyPassword,
} from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";
import { acceptInvitation, createInvitation, findInvitation, revokeInvitation } from "@/lib/invitations";
import { CheckoutError, createCheckout, createPartnerQuote, updateFulfilment, verifyCheckout } from "@/lib/orders";
import { listPartnerCatalogue, parseWholesaleInput, saveWholesalePrice } from "@/lib/wholesale";
import { parseProductInput } from "@/lib/products";

const pickup = { method: "pickup" as const, region: null, town: null, address: null, notes: null };

/** Stubs Paystack's API: initialize always succeeds; verify returns `verify`. */
function stubPaystack(verify: { status: string; amount?: number; currency?: string }) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    if (url.includes("/transaction/initialize")) {
      return new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.test/abc" } }));
    }
    if (url.includes("/transaction/verify/")) {
      return new Response(JSON.stringify({ status: true, data: { currency: "GHS", ...verify } }));
    }
    if (url.includes("resend")) return new Response("{}", { status: 200 });
    return new Response("not stubbed", { status: 500 });
  });
  return calls;
}

beforeEach(async () => {
  vi.unstubAllGlobals();
  state.env = createTestEnv({ PAYSTACK_SECRET_KEY: "sk_test_x" });
  state.cookie = undefined;
  await seedCategory(state.env);
});

describe("rate limiting", () => {
  it("allows up to the limit in a window, then refuses", async () => {
    const limit = { limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit("login:ip:1.2.3.4", limit));
    expect(results).toEqual([true, true, true, false, false]);
    // Separate keys are counted separately.
    expect(await hit("login:ip:5.6.7.8", limit)).toBe(true);
  });

  it("starts a new window once the old one ends", async () => {
    const limit = { limit: 1, windowSeconds: 60 };
    expect(await hit("k", limit)).toBe(true);
    expect(await hit("k", limit)).toBe(false);
    await state.env.DB.prepare("UPDATE rate_limits SET window_end = 0").run();
    expect(await hit("k", limit)).toBe(true);
  });
});

describe("passwords and sessions", () => {
  it("hashes with PBKDF2 and verifies", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^pbkdf2\$100000\$/);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("reset links work once and sign out every session", async () => {
    await seedUser(state.env, "u1", "a@example.com");
    await createSession("u1");
    const token = await createPasswordReset("u1");
    expect(await resetPassword(token, "new-password-1")).toBe(true);
    expect(await resetPassword(token, "new-password-2")).toBe(false);
    const sessions = await state.env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first<{ n: number }>();
    expect(sessions?.n).toBe(0);
  });

  it("gives admins 12-hour sessions and customers 30-day sessions", async () => {
    await seedUser(state.env, "admin", "admin@example.com", "admin");
    await seedUser(state.env, "cust", "c@example.com");
    await createSession("admin");
    await createSession("cust");
    const rows = (await state.env.DB.prepare("SELECT user_id, expires_at FROM sessions").all<{ user_id: string; expires_at: string }>()).results;
    const hours = (id: string) => (Date.parse(rows.find((r) => r.user_id === id)!.expires_at) - Date.now()) / 3_600_000;
    expect(hours("admin")).toBeLessThanOrEqual(12);
    expect(hours("cust")).toBeGreaterThan(24 * 29);
  });

  it("cuts a long session down to 12 hours once its account is an admin", async () => {
    await seedUser(state.env, "u", "u@example.com");
    state.cookie = await createSession("u"); // 30-day customer session
    await state.env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = 'u'").run();
    expect((await getCurrentUser())?.role).toBe("admin");
    const row = await state.env.DB.prepare("SELECT expires_at FROM sessions").first<{ expires_at: string }>();
    expect((Date.parse(row!.expires_at) - Date.now()) / 3_600_000).toBeLessThanOrEqual(12);
  });

  it("ignores unknown or expired session tokens", async () => {
    await seedUser(state.env, "u", "u@example.com");
    state.cookie = "not-a-real-token";
    expect(await getCurrentUser()).toBeNull();
    state.cookie = await createSession("u");
    await state.env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("partner invitations", () => {
  const invite = (email = "Partner@Example.com") =>
    createInvitation({ email, name: "Ama", company: "Ama Ltd", enquiryId: null, invitedBy: "admin" });

  beforeEach(async () => {
    await seedUser(state.env, "admin", "admin@example.com", "admin");
  });

  it("stores only a hash and finds the invitation by its token", async () => {
    const { token, invitation } = await invite();
    expect(invitation.email).toBe("partner@example.com");
    const stored = await state.env.DB.prepare("SELECT token_hash FROM partner_invitations").first<{ token_hash: string }>();
    expect(stored?.token_hash).not.toBe(token);
    expect((await findInvitation(token))?.status).toBe("pending");
  });

  it("accepts once, only for the invited email, and makes the account a partner", async () => {
    const { token } = await invite();
    await seedUser(state.env, "other", "other@example.com");
    await seedUser(state.env, "p", "partner@example.com");

    expect((await acceptInvitation(token, { id: "other", email: "other@example.com" })).ok).toBe(false);
    expect(await acceptInvitation(token, { id: "p", email: "partner@example.com" })).toEqual({ ok: true, company: "Ama Ltd" });
    expect((await acceptInvitation(token, { id: "p", email: "partner@example.com" })).ok).toBe(false);

    const user = await state.env.DB.prepare("SELECT role, company FROM users WHERE id = 'p'").first();
    expect(user).toEqual({ role: "partner", company: "Ama Ltd" });
  });

  it("keeps an admin an admin when they accept", async () => {
    const { token } = await invite("admin@example.com");
    await acceptInvitation(token, { id: "admin", email: "admin@example.com" });
    expect((await state.env.DB.prepare("SELECT role FROM users WHERE id = 'admin'").first<{ role: string }>())?.role).toBe("admin");
  });

  it("a new invitation replaces the old link, and revoked links stop working", async () => {
    const first = await invite();
    const second = await invite();
    expect((await findInvitation(first.token))?.status).toBe("revoked");
    expect(await revokeInvitation(second.invitation.id)).toBe(true);
    await seedUser(state.env, "p", "partner@example.com");
    expect((await acceptInvitation(second.token, { id: "p", email: "partner@example.com" })).ok).toBe(false);
  });
});

describe("checkout", () => {
  it("prices from the database, never the browser", async () => {
    await seedProduct(state.env, { id: "a", price: 4500 });
    stubPaystack({ status: "success" });
    const { reference } = await createCheckout(
      { name: "Kofi", email: "k@example.com", phone: "0240000000", delivery: pickup, items: [{ slug: "a", color: "Black", quantity: 2 }] },
      "https://shop.test"
    );
    const order = await state.env.DB.prepare("SELECT total_pesewas, delivery_method FROM orders WHERE reference = ?").bind(reference).first();
    expect(order).toEqual({ total_pesewas: 9000, delivery_method: "pickup" });
  });

  it("refuses out-of-stock and unpriced products", async () => {
    await seedProduct(state.env, { id: "out", stock: "out_of_stock" });
    await seedProduct(state.env, { id: "free", price: null });
    stubPaystack({ status: "success" });
    const buy = (slug: string) =>
      createCheckout({ name: "K", email: "k@example.com", phone: "0240000000", delivery: pickup, items: [{ slug, color: "", quantity: 1 }] }, "https://shop.test");
    await expect(buy("out")).rejects.toThrow(/out of stock/);
    await expect(buy("free")).rejects.toBeInstanceOf(CheckoutError);
    expect((await state.env.DB.prepare("SELECT COUNT(*) AS n FROM orders").first<{ n: number }>())?.n).toBe(0);
  });
});

describe("payment verification", () => {
  async function placeOrder() {
    await seedProduct(state.env, { id: "a", price: 4500 });
    stubPaystack({ status: "success", amount: 4500 });
    const { reference } = await createCheckout(
      { name: "K", email: "k@example.com", phone: "0240000000", delivery: pickup, items: [{ slug: "a", color: "", quantity: 1 }] },
      "https://shop.test"
    );
    return reference;
  }

  it("marks paid only when Paystack confirms the right amount, and emails once", async () => {
    const reference = await placeOrder();
    state.env.RESEND_API_KEY = "re_x";
    state.env.EMAIL_FROM = "Shop <shop@example.com>";
    const calls = stubPaystack({ status: "success", amount: 4500 });
    expect(await verifyCheckout(reference)).toBe("paid");
    expect(await verifyCheckout(reference)).toBe("paid");
    expect(calls.filter((c) => c.includes("resend")).length).toBe(1);
  });

  it("does not mark paid when the amount differs", async () => {
    const reference = await placeOrder();
    stubPaystack({ status: "success", amount: 100 });
    expect(await verifyCheckout(reference)).toBe("failed");
  });

  it("leaves unfinished payments pending so the webhook can confirm them later", async () => {
    const reference = await placeOrder();
    stubPaystack({ status: "abandoned" });
    expect(await verifyCheckout(reference)).toBe("pending");
    stubPaystack({ status: "success", amount: 4500 });
    expect(await verifyCheckout(reference)).toBe("paid");
  });

  it("only moves paid orders through fulfilment", async () => {
    const reference = await placeOrder();
    const { id } = (await state.env.DB.prepare("SELECT id FROM orders WHERE reference = ?").bind(reference).first<{ id: string }>())!;
    expect(await updateFulfilment(id, "dispatched")).toBeNull();
    stubPaystack({ status: "success", amount: 4500 });
    await verifyCheckout(reference);
    expect((await updateFulfilment(id, "dispatched"))?.fulfilmentStatus).toBe("dispatched");
  });
});

describe("partner quotes and wholesale", () => {
  it("quotes only partner requests and replaces an earlier open quote", async () => {
    await seedUser(state.env, "p", "p@example.com", "partner", "Ama Ltd");
    await seedUser(state.env, "c", "c@example.com");
    for (const [id, user] of [["e1", "p"], ["e2", "c"]]) {
      await state.env.DB.prepare(
        "INSERT INTO enquiries (id, type, name, email, message, product_name, quantity, user_id) VALUES (?, 'bulk_order', 'n', 'e', 'm', 'Thing', 10, ?)"
      ).bind(id, user).run();
    }
    stubPaystack({ status: "success" });
    const quote = (enquiryId: string) => createPartnerQuote({ enquiryId, unitPesewas: 3000, quantity: 10, note: null, origin: "https://shop.test" });

    await expect(quote("e2")).rejects.toThrow(/partner/);
    const first = await quote("e1");
    expect(first.totalPesewas).toBe(30000);
    expect(first.paymentUrl).toContain("paystack");
    await quote("e1");
    const open = await state.env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE enquiry_id = 'e1' AND status = 'pending'").first<{ n: number }>();
    expect(open?.n).toBe(1);
  });

  it("lists only products with a wholesale price", async () => {
    await seedProduct(state.env, { id: "a" });
    await seedProduct(state.env, { id: "b" });
    await saveWholesalePrice("a", { pricePesewas: 3000, minQuantity: 10 });
    const list = await listPartnerCatalogue();
    expect(list.map((i) => [i.id, i.wholesalePesewas, i.minQuantity])).toEqual([["a", 3000, 10]]);
  });

  it("validates wholesale input", () => {
    expect(parseWholesaleInput({ wholesalePrice: "" })).toEqual({ ok: true, value: null });
    expect(parseWholesaleInput({ wholesalePrice: "GH₵ 30.50", wholesaleMinQty: "6" })).toEqual({
      ok: true,
      value: { pricePesewas: 3050, minQuantity: 6 },
    });
    expect(parseWholesaleInput({ wholesalePrice: "-1" }).ok).toBe(false);
    expect(parseWholesaleInput({ wholesalePrice: "10", wholesaleMinQty: "0" }).ok).toBe(false);
  });
});

describe("product input validation", () => {
  const base = {
    name: "Test item",
    category: "Audio",
    description: "hello there",
    features: ["a"],
    image: "/images/x.jpg",
    imageAlt: "alt text",
    fits: ["iphone-usbc"],
  };

  it("accepts a valid product", async () => {
    expect((await parseProductInput(base)).ok).toBe(true);
  });

  it("rejects off-site image paths and unsafe 3D model links", async () => {
    for (const image of ["//evil.com/x.png", "/\\evil.com/x.png", "https://evil.com/x.png", "/images/x.jpg\" onerror=\""]) {
      expect((await parseProductInput({ ...base, image })).ok).toBe(false);
    }
    for (const model3dUrl of ["javascript:alert(1)", "http://insecure.example/m.glb", "data:text/html,x"]) {
      expect((await parseProductInput({ ...base, model3dUrl })).ok).toBe(false);
    }
    expect((await parseProductInput({ ...base, model3dUrl: "https://cdn.example/m.glb" })).ok).toBe(true);
  });
});

describe("owner rules against the database", () => {
  beforeEach(async () => {
    await seedUser(state.env, "owner1", "o1@example.com", "owner");
    await seedUser(state.env, "admin1", "a1@example.com", "admin");
    await seedUser(state.env, "cust", "c@example.com");
  });
  const owner = { id: "owner1", role: "owner" as const };
  const admin = { id: "admin1", role: "admin" as const };

  it("stops admins from creating or removing admins", async () => {
    expect(await updateUserAccess(admin, "cust", "admin", null)).toMatchObject({ status: 403 });
    expect(await updateUserAccess(admin, "owner1", "customer", null)).toMatchObject({ status: 403 });
    expect(await updateUserAccess(admin, "cust", "partner", "Ama Ltd")).toMatchObject({ user: { role: "partner" } });
  });

  it("lets an owner promote, and protects the last owner", async () => {
    expect(await updateUserAccess(owner, "admin1", "owner", null)).toMatchObject({ user: { role: "owner" } });
    // Now two owners: one may demote the other, but not the last one left.
    const second = { id: "admin1", role: "owner" as const };
    expect(await updateUserAccess(second, "owner1", "admin", null)).toMatchObject({ user: { role: "admin" } });
    expect(await updateUserAccess({ id: "owner1", role: "owner" }, "admin1", "admin", null)).toMatchObject({ status: 403 });
    const owners = await state.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").first<{ n: number }>();
    expect(owners?.n).toBe(1);
  });

  it("signs the account out when its role changes", async () => {
    await createSession("cust");
    await updateUserAccess(owner, "cust", "admin", null);
    const n = await state.env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'cust'").first<{ n: number }>();
    expect(n?.n).toBe(0);
  });
});

describe("area-aware sign-in", () => {
  async function signIn(email: string, area?: string) {
    const res = await login(
      new Request("https://shop.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "pass-1234", area }),
      })
    );
    return { status: res.status, body: (await res.json()) as { error?: string; home?: string } };
  }

  beforeEach(async () => {
    const hash = await hashPassword("pass-1234");
    for (const [id, email, role] of [["c", "c@example.com", "customer"], ["p", "p@example.com", "partner"], ["o", "o@example.com", "owner"]]) {
      await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, 'n', ?, ?)")
        .bind(id, email, hash, role)
        .run();
    }
  });

  it("makes a customer on the admin page look exactly like a wrong password", async () => {
    const wrongRole = await signIn("c@example.com", "admin");
    const unknown = await signIn("nobody@example.com", "admin");
    expect(wrongRole).toEqual(unknown);
    expect(wrongRole.status).toBe(401);
  });

  it("tells a customer on the partner page they have no partner access", async () => {
    expect(await signIn("c@example.com", "partner")).toMatchObject({ status: 403 });
  });

  it("signs staff and partners in and points them to their home", async () => {
    expect(await signIn("o@example.com", "admin")).toEqual({ status: 200, body: { ok: true, home: "/admin" } });
    expect((await signIn("p@example.com", "partner")).body.home).toBe("/partner");
    expect((await signIn("p@example.com")).body.home).toBe("/partner");
    expect((await signIn("c@example.com")).body.home).toBe("/account");
  });
});
