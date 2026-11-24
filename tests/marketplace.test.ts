import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory, seedProduct } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined), set: () => {}, delete: () => {} }),
}));

import { createSession } from "@/lib/auth";
import { getProductBySlug, listProducts, deleteProduct, createProduct, type ProductInput } from "@/lib/products";
import { createCheckout } from "@/lib/orders";
import { listPartnerOrderItems, partnerEarnings, recordPayout, updatePartnerItem } from "@/lib/partner-orders";
import { listActivity } from "@/lib/activity";
import { POST as createPartnerProduct } from "@/app/api/partner/products/route";
import { PATCH as editPartnerProduct, DELETE as deletePartnerProduct } from "@/app/api/partner/products/[id]/route";
import { POST as setVisibility } from "@/app/api/partner/products/[id]/visibility/route";
import { POST as requestCategory } from "@/app/api/partner/category-requests/route";
import { POST as reviewProduct } from "@/app/api/admin/products/[id]/review/route";

async function partner(id: string, status: "pending" | "trusted" | "suspended" = "trusted", commissionBps = 1000) {
  await state.env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, company, partner_status, commission_bps) VALUES (?, ?, ?, 'x', 'partner', ?, ?, ?)"
  )
    .bind(id, `${id}@example.com`, id, `${id} Ltd`, status, commissionBps)
    .run();
}
const signIn = async (id: string) => {
  state.cookie = await createSession(id);
};
const json = (body: unknown, method = "POST") =>
  new Request("https://shop.test/x", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const productBody = (owner: string, overrides: Record<string, unknown> = {}) => ({
  name: "Clear phone case",
  category: "Audio",
  description: "A sturdy clear case",
  features: ["Shockproof"],
  image: `/api/media/partners/${owner}/a.jpg`,
  imageAlt: "Clear case",
  fits: ["iphone-usbc"],
  price: "40",
  stockStatus: "in_stock",
  ...overrides,
});

beforeEach(async () => {
  vi.unstubAllGlobals();
  state.env = createTestEnv({ PAYSTACK_SECRET_KEY: "sk_test_x" });
  state.cookie = undefined;
  await seedCategory(state.env);
});

describe("partner products", () => {
  it("goes live for trusted partners and waits for review for new ones", async () => {
    await partner("t", "trusted");
    await partner("n", "pending");
    await signIn("t");
    const live = await (await createPartnerProduct(json(productBody("t")))).json();
    await signIn("n");
    const waiting = await (await createPartnerProduct(json(productBody("n", { name: "Pending case" })))).json();
    expect([live.product.status, waiting.product.status]).toEqual(["live", "pending"]);
    expect((await listProducts()).map((p) => p.name)).toEqual(["Clear phone case"]);
    expect(await getProductBySlug(waiting.product.slug)).toBeNull();
  });

  it("only lets partners use photos from their own upload folder", async () => {
    await partner("a");
    await signIn("a");
    for (const image of ["/api/media/partners/b/x.jpg", "/api/media/products/x.jpg", "/images/team.jpg"]) {
      expect((await createPartnerProduct(json(productBody("a", { image })))).status).toBe(400);
    }
    expect((await createPartnerProduct(json(productBody("a", { gallery: ["/api/media/partners/b/y.jpg"] })))).status).toBe(400);
  });

  it("never lets a partner change another seller's or NOBYST's products", async () => {
    await partner("a");
    await partner("b");
    await seedProduct(state.env, { id: "nobyst" });
    await signIn("b");
    const theirs = (await (await createPartnerProduct(json(productBody("b")))).json()).product;
    await signIn("a");
    for (const id of [theirs.id, "nobyst"]) {
      expect((await editPartnerProduct(json(productBody("a"), "PATCH"), params(id))).status).toBe(404);
      expect((await deletePartnerProduct(new Request("https://shop.test/x", { method: "DELETE" }), params(id))).status).toBe(404);
      expect((await setVisibility(json({ visible: false }), params(id))).status).toBe(404);
    }
    expect(await getProductBySlug(theirs.slug)).not.toBeNull();
  });

  it("sends a rejected product back for review even from a trusted partner", async () => {
    await partner("t", "trusted");
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES ('adm', 'adm@e.com', 'A', 'x', 'admin')").run();
    await signIn("t");
    const p = (await (await createPartnerProduct(json(productBody("t")))).json()).product;
    await state.env.DB.prepare("UPDATE products SET status = 'rejected', review_note = 'Blurry photo' WHERE id = ?").bind(p.id).run();
    const edited = await (await editPartnerProduct(json(productBody("t", { name: "Clear case v2" }), "PATCH"), params(p.id))).json();
    expect(edited.product.status).toBe("pending");
    // A rejected product cannot be un-hidden by the partner; only an edit resubmits it.
    await state.env.DB.prepare("UPDATE products SET status = 'rejected' WHERE id = ?").bind(p.id).run();
    expect((await setVisibility(json({ visible: true }), params(p.id))).status).toBe(400);
  });

  it("keeps hidden products hidden when edited, and hides suspended partners' shops", async () => {
    await partner("t", "trusted");
    await signIn("t");
    const p = (await (await createPartnerProduct(json(productBody("t")))).json()).product;
    await setVisibility(json({ visible: false }), params(p.id));
    const edited = await (await editPartnerProduct(json(productBody("t"), "PATCH"), params(p.id))).json();
    expect(edited.product.status).toBe("hidden");
    await setVisibility(json({ visible: true }), params(p.id));
    expect(await getProductBySlug(p.slug)).not.toBeNull();
    await state.env.DB.prepare("UPDATE users SET partner_status = 'suspended' WHERE id = 't'").run();
    expect(await getProductBySlug(p.slug)).toBeNull();
    expect(await listProducts()).toHaveLength(0);
  });

  it("lets an admin approve or reject, with a note required to reject", async () => {
    await partner("n", "pending");
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES ('adm', 'adm@e.com', 'A', 'x', 'admin')").run();
    await state.env.DB.prepare("INSERT INTO user_totp (user_id, secret_ciphertext, enabled_at) VALUES ('adm', 'x', datetime('now'))").run();
    await signIn("n");
    const p = (await (await createPartnerProduct(json(productBody("n")))).json()).product;
    await signIn("adm");
    await state.env.DB.prepare("UPDATE sessions SET mfa_verified_at = datetime('now')").run();
    expect((await reviewProduct(json({ status: "rejected" }), params(p.id))).status).toBe(400);
    expect((await (await reviewProduct(json({ status: "live" }), params(p.id))).json()).product.status).toBe("live");
    expect(await getProductBySlug(p.slug)).not.toBeNull();
  });
});

describe("partner orders and money", () => {
  async function sale() {
    await partner("a", "trusted", 1000);
    await partner("b", "trusted", 2000);
    const input = (name: string): ProductInput => ({
      name, category: "Audio", description: "desc ok", features: ["x"], image: "/x.jpg", gallery: [], colors: [],
      pricePesewas: 10_000, stockStatus: "in_stock", imageAlt: "alt", fits: ["iphone-usbc"],
    });
    const pa = await createProduct(input("A case"), { partnerId: "a", status: "live" });
    const pb = await createProduct(input("B case"), { partnerId: "b", status: "live" });
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("initialize")
        ? new Response(JSON.stringify({ status: true, data: { authorization_url: "https://pay.test" } }))
        : new Response("{}")
    );
    const { reference } = await createCheckout(
      {
        name: "Kofi",
        email: "k@example.com",
        phone: "0240000000",
        delivery: { method: "delivery", region: "Ashanti", town: "Kumasi", address: "Adum, near the market", notes: null },
        items: [
          { slug: pa.slug, color: "", quantity: 2 },
          { slug: pb.slug, color: "", quantity: 1 },
        ],
      },
      "https://shop.test"
    );
    await state.env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE reference = ?").bind(reference).run();
    return reference;
  }

  it("records each line's seller and commission rate at the time of sale", async () => {
    await sale();
    await state.env.DB.prepare("UPDATE users SET commission_bps = 5000").run(); // a later change
    const rows = (await state.env.DB.prepare("SELECT partner_id, commission_bps FROM order_items ORDER BY partner_id").all()).results;
    expect(rows).toEqual([
      { partner_id: "a", commission_bps: 1000 },
      { partner_id: "b", commission_bps: 2000 },
    ]);
  });

  it("shows each partner only their own lines, and only they can update them", async () => {
    await sale();
    const a = await listPartnerOrderItems("a");
    expect(a.map((i) => i.productName)).toEqual(["A case"]);
    expect(a[0].delivery.town).toBe("Kumasi");
    const b = await listPartnerOrderItems("b");
    const asA = { id: "a", email: "a@example.com", name: "a", role: "partner" as const, company: "a Ltd", twoFactorEnabled: false, needsTwoFactorSetup: false, partnerStatus: "trusted" as const, emailVerified: true };
    expect(await updatePartnerItem(asA, b[0].id, "delivered")).toBeNull();
    expect((await listPartnerOrderItems("b"))[0].fulfilmentStatus).toBe("new");
    expect((await updatePartnerItem(asA, a[0].id, "delivered"))?.fulfilmentStatus).toBe("delivered");
  });

  it("works out earnings after commission, counting delivered lines, minus payouts", async () => {
    await sale();
    let e = await partnerEarnings("a");
    expect(e).toMatchObject({ grossPesewas: 20_000, commissionPesewas: 2_000, earnedPesewas: 0, pendingPesewas: 18_000, owedPesewas: 0 });
    const asA = { id: "a", email: "a@example.com", name: "a", role: "partner" as const, company: "a Ltd", twoFactorEnabled: false, needsTwoFactorSetup: false, partnerStatus: "trusted" as const, emailVerified: true };
    const [line] = await listPartnerOrderItems("a");
    await updatePartnerItem(asA, line.id, "delivered");
    e = await partnerEarnings("a");
    expect(e).toMatchObject({ earnedPesewas: 18_000, owedPesewas: 18_000 });
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES ('adm', 'adm@e.com', 'A', 'x', 'admin')").run();
    const admin = { ...asA, id: "adm", email: "adm@e.com", role: "admin" as const, partnerStatus: null };
    await recordPayout(admin, "a", { amountPesewas: 10_000, method: "MTN MoMo", reference: "TX1", note: null });
    expect((await partnerEarnings("a")).owedPesewas).toBe(8_000);
    // Cancelled lines earn nothing.
    await updatePartnerItem(asA, line.id, "cancelled");
    expect((await partnerEarnings("a")).grossPesewas).toBe(0);
  });
});

describe("marketplace records", () => {
  it("logs partner actions for the admin activity feed", async () => {
    await partner("t");
    await signIn("t");
    const p = (await (await createPartnerProduct(json(productBody("t")))).json()).product;
    await deletePartnerProduct(new Request("https://shop.test/x", { method: "DELETE" }), params(p.id));
    const actions = (await listActivity({ partnerId: "t" })).map((e) => e.action).sort();
    expect(actions).toEqual(["product.create", "product.delete"]);
    expect((await listActivity())[0].summary).toContain("t Ltd");
  });

  it("keeps a photo that another product still uses", async () => {
    const deleted: string[] = [];
    state.env.MEDIA.delete = async (key: string) => {
      deleted.push(key);
    };
    await seedProduct(state.env, { id: "one" });
    await seedProduct(state.env, { id: "two" });
    await state.env.DB.prepare("UPDATE products SET image = '/api/media/products/shared.jpg'").run();
    await deleteProduct("one");
    expect(deleted).toEqual([]);
    await deleteProduct("two");
    expect(deleted).toEqual(["products/shared.jpg"]);
  });

  it("takes category requests, refusing names that already exist", async () => {
    await partner("t");
    await signIn("t");
    expect((await requestCategory(json({ name: "audio" }))).status).toBe(409);
    const res = await requestCategory(json({ name: "Phone cases", note: "Silicone and clear cases" }));
    expect(res.status).toBe(201);
    expect((await res.json()).request).toMatchObject({ name: "Phone cases", status: "pending" });
  });
});
