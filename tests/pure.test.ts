import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { describeDelivery, parseDelivery } from "@/lib/delivery";
import { matchesSignature } from "@/lib/media";
import { isValidPaystackSignature } from "@/lib/paystack";

describe("parseDelivery", () => {
  it("accepts pickup without an address", () => {
    expect(parseDelivery({ method: "pickup" })).toEqual({
      method: "pickup",
      region: null,
      town: null,
      address: null,
      notes: null,
    });
  });

  it("requires region, town and address for delivery", () => {
    expect(parseDelivery({ method: "delivery" })).toBe("Choose your region.");
    expect(parseDelivery({ method: "delivery", region: "Bono East" })).toBe("Enter your town or city.");
    expect(parseDelivery({ method: "delivery", region: "Bono East", town: "Techiman" })).toMatch(/address/);
    expect(parseDelivery({ method: "delivery", region: "Atlantis", town: "X", address: "12 Main St" })).toBe(
      "Choose your region."
    );
  });

  it("rejects unknown methods, including 'arranged' which only the server sets", () => {
    expect(parseDelivery({ method: "arranged" })).toBe("Choose delivery or pickup.");
    expect(parseDelivery(null)).toBe("Choose delivery or pickup.");
  });

  it("caps long fields", () => {
    const d = parseDelivery({ method: "delivery", region: "Ashanti", town: "Kumasi", address: "x".repeat(900), notes: "n".repeat(900) });
    expect(typeof d).toBe("object");
    if (typeof d === "object") {
      expect(d.address).toHaveLength(300);
      expect(d.notes).toHaveLength(500);
    }
  });

  it("describes delivery for emails", () => {
    expect(describeDelivery({ method: "pickup" })).toBe("Pickup in Techiman");
    expect(describeDelivery({ method: "delivery", region: "Ashanti", town: "Kumasi", address: "Adum" })).toBe(
      "Adum, Kumasi, Ashanti"
    );
  });
});

describe("upload signature check", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)].slice(0, 16));
  const text = (s: string) => new TextEncoder().encode(s.padEnd(16, " "));

  it("accepts real image and model headers", () => {
    expect(matchesSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "jpg")).toBe(true);
    expect(matchesSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a), "png")).toBe(true);
    expect(matchesSignature(text("RIFF\0\0\0\0WEBPVP8"), "webp")).toBe(true);
    expect(matchesSignature(text("glTF"), "glb")).toBe(true);
    expect(matchesSignature(text('  {"asset":{}}'), "gltf")).toBe(true);
  });

  it("rejects HTML or scripts renamed as images", () => {
    expect(matchesSignature(text("<html><script>"), "png")).toBe(false);
    expect(matchesSignature(text("<svg onload=x>"), "jpg")).toBe(false);
    expect(matchesSignature(text("<html>"), "gltf")).toBe(false);
    expect(matchesSignature(text("PNG"), "svg")).toBe(false);
  });
});

describe("Paystack webhook signature", () => {
  const secret = "sk_test_example";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "NBG-ABC" } });
  const good = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts Paystack's HMAC-SHA512 of the raw body", async () => {
    expect(await isValidPaystackSignature(secret, body, good)).toBe(true);
  });

  it("rejects a wrong key, a changed body or a malformed header", async () => {
    expect(await isValidPaystackSignature("sk_other", body, good)).toBe(false);
    expect(await isValidPaystackSignature(secret, body + " ", good)).toBe(false);
    expect(await isValidPaystackSignature(secret, body, "")).toBe(false);
    expect(await isValidPaystackSignature(secret, body, good.toUpperCase())).toBe(false);
  });
});
