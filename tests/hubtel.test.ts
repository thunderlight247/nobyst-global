import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { seedCategory, seedProduct } from "./helpers/seed";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));

import { activeProvider } from "@/lib/payments/provider";
import { hubtelCallbackUrl } from "@/lib/payments/hubtel";
import { createCheckout, storedPaymentState, verifyCheckout } from "@/lib/orders";
import { POST as callback } from "@/app/api/hubtel/callback/route";

const HUBTEL = {
  PAYMENT_PROVIDER: "hubtel",
  HUBTEL_CLIENT_ID: "api-id",
  HUBTEL_CLIENT_SECRET: "api-key",
  HUBTEL_MERCHANT_ACCOUNT: "2020000",
  HUBTEL_CALLBACK_SECRET: "callback-secret-for-tests",
  RESEND_API_KEY: "re_x",
  EMAIL_FROM: "NOBYST <info@nobyst.com>",
};

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];
let relayReply: unknown = null;
function stubNetwork(initiate: unknown = { responseCode: "0000", status: "Success", data: { checkoutUrl: "https://pay.hubtel.com/abc", checkoutId: "chk_123", clientReference: "x" } }) {
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("payproxyapi.hubtel.com/items/initiate")) return new Response(JSON.stringify(initiate));
    if (url.includes("relay.test")) return new Response(JSON.stringify(relayReply));
    if (url.includes("resend")) return new Response("{}");
    return new Response("not stubbed", { status: 500 });
  });
}

const order = {
  name: "Kofi",
  email: "k@example.com",
  phone: "0240000000",
  delivery: { method: "pickup" as const, region: null, town: null, address: null, notes: null },
  items: [{ slug: "p1", color: "", quantity: 2 }],
};

async function placeHubtelOrder() {
  const { reference } = await createCheckout(order, "https://shop.test");
  return reference;
}

async function post(reference: string, body: unknown, sig?: string) {
  const url = sig === undefined ? await hubtelCallbackUrl(state.env, "https://shop.test", reference) : `https://shop.test/api/hubtel/callback?reference=${reference}&sig=${sig}`;
  return callback(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
}

const success = (reference: string, amount = 90, checkoutId = "chk_123") => ({
  ResponseCode: "0000",
  Status: "Success",
  Data: { CheckoutId: checkoutId, SalesInvoiceId: "inv_9", ClientReference: reference, Status: "Success", Amount: amount, CustomerPhoneNumber: "233240000000" },
});

beforeEach(async () => {
  vi.unstubAllGlobals();
  relayReply = null;
  state.env = createTestEnv(HUBTEL);
  await seedCategory(state.env);
  await seedProduct(state.env, { id: "p1", price: 4500 });
  stubNetwork();
});

describe("choosing the provider", () => {
  it("uses Hubtel only when switched on and fully configured, otherwise Paystack while it has a key", () => {
    expect(activeProvider(state.env)).toBe("hubtel");
    expect(activeProvider({ ...state.env, HUBTEL_CALLBACK_SECRET: undefined })).toBeNull();
    expect(activeProvider({ ...state.env, PAYMENT_PROVIDER: undefined, PAYSTACK_SECRET_KEY: "sk" })).toBe("paystack");
    expect(activeProvider({ ...state.env, PAYMENT_PROVIDER: undefined })).toBeNull();
  });
});

describe("starting a Hubtel payment", () => {
  it("sends the amount in cedis with Basic auth and a signed callback address", async () => {
    const reference = await placeHubtelOrder();
    const call = calls.find((c) => c.url.includes("items/initiate"))!;
    expect((call.init!.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa("api-id:api-key")}`);
    const body = JSON.parse(String(call.init!.body));
    expect(body).toMatchObject({ totalAmount: 90, merchantAccountNumber: "2020000", clientReference: reference });
    expect(body.callbackUrl).toMatch(new RegExp(`^https://shop.test/api/hubtel/callback\\?reference=${reference}&sig=[0-9a-f]{64}$`));
    expect(body.returnUrl).toBe(`https://shop.test/checkout/verify?reference=${reference}`);
    const row = await state.env.DB.prepare("SELECT payment_provider, provider_checkout_id, payment_url FROM orders").first();
    expect(row).toEqual({ payment_provider: "hubtel", provider_checkout_id: "chk_123", payment_url: "https://pay.hubtel.com/abc" });
  });

  it("marks the order failed when Hubtel refuses to start", async () => {
    stubNetwork({ responseCode: "4000", status: "Error", message: "bad merchant" });
    await expect(placeHubtelOrder()).rejects.toThrow(/Could not start payment/);
    expect((await state.env.DB.prepare("SELECT status FROM orders").first<{ status: string }>())?.status).toBe("failed");
  });
});

describe("Hubtel callbacks", () => {
  it("refuses callbacks without a valid signature", async () => {
    const reference = await placeHubtelOrder();
    expect((await post(reference, success(reference), "")).status).toBe(401);
    expect((await post(reference, success(reference), "0".repeat(64))).status).toBe(401);
    expect(await storedPaymentState(reference)).toBe("pending");
  });

  it("refuses a short amount, another order's reference, or another checkout id", async () => {
    const reference = await placeHubtelOrder();
    for (const body of [success(reference, 89.99), success("NBG-OTHER"), success(reference, 90, "chk_other"), { ResponseCode: "0000", Data: { Status: "Success" } }]) {
      expect(await (await post(reference, body)).json()).toMatchObject({ result: "mismatch" });
    }
    expect(await storedPaymentState(reference)).toBe("pending");
  });

  it("marks a correct payment paid once, emailing the customer once", async () => {
    const reference = await placeHubtelOrder();
    expect(await (await post(reference, success(reference))).json()).toMatchObject({ result: "paid" });
    expect(await (await post(reference, success(reference))).json()).toMatchObject({ result: "paid" });
    expect(calls.filter((c) => c.url.includes("resend")).length).toBe(1);
    expect(await state.env.DB.prepare("SELECT status, provider_transaction_id FROM orders").first()).toEqual({ status: "paid", provider_transaction_id: "inv_9" });
    expect(await verifyCheckout(reference)).toBe("paid");
  });

  it("records failed payments and leaves unfinished ones pending", async () => {
    const reference = await placeHubtelOrder();
    expect(await verifyCheckout(reference)).toBe("pending");
    await post(reference, { ResponseCode: "2001", Status: "Failed", Data: { ClientReference: reference, CheckoutId: "chk_123", Status: "Failed", Amount: 90 } });
    expect(await storedPaymentState(reference)).toBe("failed");
  });

  it("with a status relay configured, also needs Hubtel's Status API to agree", async () => {
    state.env.HUBTEL_STATUS_RELAY_URL = "https://relay.test";
    state.env.HUBTEL_STATUS_RELAY_TOKEN = "relay-token";
    const reference = await placeHubtelOrder();
    relayReply = { responseCode: "0000", data: { status: "Unpaid", amount: 90, clientReference: reference } };
    expect(await (await post(reference, success(reference))).json()).toMatchObject({ result: "mismatch" });
    relayReply = { responseCode: "0000", data: { status: "Paid", amount: 90, clientReference: reference } };
    expect(await (await post(reference, success(reference))).json()).toMatchObject({ result: "paid" });
    const relayCall = calls.find((c) => c.url.includes("relay.test"))!;
    expect(relayCall.url).toBe(`https://relay.test/transactions/2020000/status?clientReference=${reference}`);
    expect((relayCall.init!.headers as Record<string, string>).Authorization).toBe("Bearer relay-token");
  });
});
