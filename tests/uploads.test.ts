import { crc32, deflateSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareEnv } from "@/lib/cloudflare";
import { createTestEnv } from "./helpers/d1";
import { containsMarkup, sanitizeUpload, IMAGE_MAX_BYTES } from "@/lib/upload-sanitize";

const state = vi.hoisted(() => ({ env: null as unknown as CloudflareEnv, cookie: undefined as string | undefined }));
vi.mock("@/lib/cloudflare", () => ({ getEnv: async () => state.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined), set: () => {}, delete: () => {} }),
}));

import { listMediaUploads, partnerOwnsMedia, storeUpload } from "@/lib/media-upload";
import { GET as serveMedia } from "@/app/api/media/[...key]/route";

/* ---------- tiny file builders (no image library needed) ---------- */
const enc = (s: string) => new TextEncoder().encode(s);
const cat = (...parts: (Uint8Array | number[])[]) => {
  const arrs = parts.map((p) => (p instanceof Uint8Array ? p : new Uint8Array(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
};
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function pngChunk(type: string, data: Uint8Array, badCrc = false) {
  const td = cat(enc(type), data);
  return cat(be32(data.length), td, be32((crc32(td) ^ (badCrc ? 1 : 0)) >>> 0));
}
function png(w = 2, h = 2, extra: Uint8Array[] = [], opts: { badCrc?: boolean } = {}) {
  const raw = new Uint8Array(h * (1 + w * 3));
  return cat(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    pngChunk("IHDR", cat(be32(w), be32(h), [8, 2, 0, 0, 0])),
    ...extra,
    pngChunk("IDAT", new Uint8Array(deflateSync(raw)), opts.badCrc),
    pngChunk("IEND", new Uint8Array())
  );
}
const seg = (marker: number, data: Uint8Array | number[]) => {
  const d = data instanceof Uint8Array ? data : new Uint8Array(data);
  return cat([0xff, marker, (d.length + 2) >> 8, (d.length + 2) & 255], d);
};
function jpeg(extraSegments: Uint8Array[] = [], w = 16, h = 16) {
  return cat(
    [0xff, 0xd8],
    seg(0xe0, cat(enc("JFIF\0"), [1, 1, 0, 0, 1, 0, 1, 0, 0])),
    ...extraSegments,
    seg(0xdb, cat([0], new Uint8Array(64).fill(1))),
    seg(0xc0, [8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]),
    seg(0xc4, cat([0], new Uint8Array(16), [])),
    seg(0xda, [1, 1, 0, 0, 63, 0]),
    [0x12, 0x34, 0xff, 0x00, 0x56], // scan data with a stuffed byte
    [0xff, 0xd9]
  );
}
const exifWithOrientation = (o: number) =>
  seg(0xe1, cat(enc("Exif\0\0"), [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 2], [0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0], [0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0x26], [0, 0, 0, 0], enc("GPSDATA-5.6N-1.8W")));

const SCRIPT = "<script>steal(document.cookie)</script>";

describe("deep image checks", () => {
  it("rebuilds PNGs without text chunks or anything after the end", () => {
    const evil = cat(png(2, 2, [pngChunk("tEXt", enc(`Comment\0${SCRIPT}`))]), enc("<?php system($_GET['c']); ?>"));
    const r = sanitizeUpload("png", evil);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const text = new TextDecoder("latin1").decode(r.bytes);
      expect(text).not.toContain("<script");
      expect(text).not.toContain("<?php");
      expect(text).not.toContain("tEXt");
      expect(r.bytes.length).toBe(png().length);
    }
  });

  it("refuses damaged PNGs and oversized dimensions", () => {
    expect(sanitizeUpload("png", png(2, 2, [], { badCrc: true })).ok).toBe(false);
    expect(sanitizeUpload("png", png(9000, 1))).toMatchObject({ ok: false, error: expect.stringMatching(/8000 pixels/) });
    expect(sanitizeUpload("png", png(7000, 7000))).toMatchObject({ ok: false });
    expect(sanitizeUpload("png", png().subarray(0, 40)).ok).toBe(false); // cut short, no IEND
  });

  it("rebuilds JPEGs without comments, EXIF/GPS or trailing data, keeping the orientation", () => {
    const evil = cat(jpeg([exifWithOrientation(6), seg(0xfe, enc("<?php eval($_POST[x]); ?>")), seg(0xed, enc(SCRIPT))]), enc("<html>" + SCRIPT));
    const r = sanitizeUpload("jpg", evil);
    expect(r).toMatchObject({ ok: true, width: 16, height: 16 });
    if (r.ok) {
      const text = new TextDecoder("latin1").decode(r.bytes);
      for (const bad of ["<?php", "<script", "<html", "GPSDATA"]) expect(text).not.toContain(bad);
      expect(text).toContain("Exif"); // orientation-only EXIF
      expect(r.bytes[r.bytes.length - 2]).toBe(0xff);
      expect(r.bytes[r.bytes.length - 1]).toBe(0xd9);
    }
  });

  it("refuses code hidden inside the picture data itself", () => {
    const evil = cat(png(2, 2, [pngChunk("IDAT", enc(SCRIPT))]));
    expect(sanitizeUpload("png", evil)).toMatchObject({ ok: false, error: expect.stringMatching(/hidden code/) });
  });

  it("refuses files that only pretend to be images", () => {
    expect(sanitizeUpload("png", enc("<html><script>alert(1)</script></html>")).ok).toBe(false);
    expect(sanitizeUpload("jpg", cat([0xff, 0xd8, 0xff], enc(SCRIPT))).ok).toBe(false);
    expect(sanitizeUpload("webp", enc("RIFF\x10\0\0\0WEBPjunkjunk")).ok).toBe(false);
  });

  it("enforces the size limit", () => {
    expect(sanitizeUpload("png", new Uint8Array(IMAGE_MAX_BYTES + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/6 MB/) });
  });

  it("refuses 3D models that link to outside files", () => {
    const gltf = (uri: string) => enc(JSON.stringify({ asset: { version: "2.0" }, buffers: [{ uri, byteLength: 4 }] }));
    expect(sanitizeUpload("gltf", gltf("https://tracker.example/model.bin")).ok).toBe(false);
    expect(sanitizeUpload("gltf", gltf("data:application/octet-stream;base64,AAAAAA==")).ok).toBe(true);
    expect(sanitizeUpload("gltf", enc('{"asset":{"version":"2.0"},"extras":"<script>x</script>"}')).ok).toBe(false);
  });

  it("does not flag ordinary binary data as code", () => {
    const noise = new Uint8Array(2_000_000);
    let x = 12345;
    for (let i = 0; i < noise.length; i++) noise[i] = (x = (x * 1103515245 + 12345) >>> 0) >>> 24;
    expect(containsMarkup(noise)).toBe(false);
  });
});

describe("storing uploads", () => {
  beforeEach(async () => {
    state.env = createTestEnv();
    const stored = new Map<string, Uint8Array>();
    state.env.MEDIA = {
      put: async (key: string, value: unknown) => void stored.set(key, value as Uint8Array),
      get: async (key: string) => {
        const v = stored.get(key);
        return v ? { body: new Blob([v as BlobPart]).stream(), httpEtag: '"e"', writeHttpMetadata: () => {} } : null;
      },
      delete: async (key: string) => void stored.delete(key),
    };
    await state.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role, partner_status) VALUES ('p1', 'p1@e.com', 'P', 'x', 'partner', 'trusted'), ('p2', 'p2@e.com', 'P', 'x', 'partner', 'trusted')").run();
  });

  const upload = (name: string, bytes: Uint8Array, type = "image/png") => {
    const form = new FormData();
    form.append("file", new File([bytes as BlobPart], name, { type }));
    return storeUpload(new Request("https://shop.test/x", { method: "POST", body: form }), { id: "p1", email: "p1@e.com", role: "partner" });
  };

  it("stores a random name publicly and the original name privately", async () => {
    const res = await upload("Ama's shop – red case FINAL.png", png());
    const { url } = (await res.json()) as { url: string };
    expect(url).toMatch(/^\/api\/media\/m\/[0-9a-f-]{36}\.png$/);
    expect(url).not.toContain("p1");
    const [entry] = await listMediaUploads();
    expect(entry).toMatchObject({ url, originalName: "Ama's shop – red case FINAL.png", uploaderEmail: "p1@e.com", uploaderRole: "partner", width: 2, height: 2 });
    expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("lets only the uploader use the file on a product", async () => {
    const { url } = (await (await upload("case.png", png())).json()) as { url: string };
    expect(await partnerOwnsMedia("p1", url)).toBe(true);
    expect(await partnerOwnsMedia("p2", url)).toBe(false);
    expect(await partnerOwnsMedia("p1", "/api/media/partners/p1/old.jpg")).toBe(true); // older folder uploads
    expect(await partnerOwnsMedia("p2", "/api/media/partners/p1/old.jpg")).toBe(false);
  });

  it("refuses disguised and oversized files before storing anything", async () => {
    expect((await upload("cute.png", enc("<html><script>x</script></html>"))).status).toBe(415);
    expect((await upload("huge.png", new Uint8Array(IMAGE_MAX_BYTES + 10))).status).toBe(413);
    expect(await listMediaUploads()).toHaveLength(0);
  });

  it("serves files only as images, sandboxed", async () => {
    const { url } = (await (await upload("case.png", png())).json()) as { url: string };
    const key = url.replace("/api/media/", "").split("/");
    const res = await serveMedia(new Request("https://shop.test" + url), { params: Promise.resolve({ key }) });
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    for (const bad of [["m", "../secret"], ["m", "x.html"], ["other", "a.png"]]) {
      expect((await serveMedia(new Request("https://shop.test/x"), { params: Promise.resolve({ key: bad }) })).status).toBe(404);
    }
  });
});
