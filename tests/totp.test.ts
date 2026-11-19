import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hotp, matchTotp, otpauthUri, STEP_SECONDS } from "@/lib/totp";
import { openSecret, sealSecret, SecretBoxKeyError } from "@/lib/secret-box";

// RFC 6238 appendix B, SHA-1 key "12345678901234567890".
const RFC_SECRET = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("TOTP", () => {
  it("round-trips base32", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(new TextDecoder().decode(base32Decode(RFC_SECRET))).toBe("12345678901234567890");
  });

  it("matches the RFC 6238 test vectors", async () => {
    const vectors: [number, string][] = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
      [20000000000, "65353130"],
    ];
    for (const [t, code] of vectors) {
      expect(await hotp(RFC_SECRET, Math.floor(t / STEP_SECONDS), 8)).toBe(code);
    }
  });

  it("accepts one step of clock drift either way, but no more", async () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / STEP_SECONDS);
    expect(await matchTotp(RFC_SECRET, await hotp(RFC_SECRET, step), now, null)).toBe(step);
    expect(await matchTotp(RFC_SECRET, await hotp(RFC_SECRET, step - 1), now, null)).toBe(step - 1);
    expect(await matchTotp(RFC_SECRET, await hotp(RFC_SECRET, step + 1), now, null)).toBe(step + 1);
    expect(await matchTotp(RFC_SECRET, await hotp(RFC_SECRET, step - 2), now, null)).toBeNull();
    expect(await matchTotp(RFC_SECRET, "abc123", now, null)).toBeNull();
  });

  it("never accepts a step at or before the last one used", async () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / STEP_SECONDS);
    const code = await hotp(RFC_SECRET, step);
    expect(await matchTotp(RFC_SECRET, code, now, step)).toBeNull();
    expect(await matchTotp(RFC_SECRET, code, now, step - 1)).toBe(step);
  });

  it("builds an otpauth link apps can scan", () => {
    const uri = otpauthUri("a@b.com", RFC_SECRET);
    expect(uri.startsWith("otpauth://totp/NOBYST%20GLOBAL%3Aa%40b.com?")).toBe(true);
    expect(new URL(uri).searchParams.get("secret")).toBe(RFC_SECRET);
  });
});

describe("secret box", () => {
  const key = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i)));
  const otherKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

  it("encrypts with a random IV and decrypts with the same key", async () => {
    const a = await sealSecret("JBSWY3DPEHPK3PXP", key);
    const b = await sealSecret("JBSWY3DPEHPK3PXP", key);
    expect(a).not.toBe(b);
    expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(await openSecret(a, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("fails with the wrong key, a tampered value, or no key", async () => {
    const sealed = await sealSecret("secret", key);
    await expect(openSecret(sealed, otherKey)).rejects.toThrow();
    await expect(openSecret(sealed.slice(0, -4) + "AAAA", key)).rejects.toThrow();
    await expect(sealSecret("x", undefined)).rejects.toBeInstanceOf(SecretBoxKeyError);
    await expect(sealSecret("x", btoa("short"))).rejects.toBeInstanceOf(SecretBoxKeyError);
  });
});
