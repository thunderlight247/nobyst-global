/**
 * Deep checks for uploaded files. A file is only accepted if it parses completely as the type it
 * claims, and images are rebuilt keeping only the picture itself: comments, text chunks, EXIF/XMP
 * metadata (which can carry hidden code, and the GPS location of phone photos) and any bytes after
 * the image's end marker are dropped. The result is then scanned for script/HTML/PHP markers.
 *
 * Even a file that slipped through would be harmless when served: /api/media sends it with a fixed
 * image content type, nosniff and a CSP sandbox, so browsers never run it. These checks make sure
 * nothing but picture data is stored in the first place.
 */

export type UploadKind = "jpg" | "png" | "webp" | "glb" | "gltf";

export const IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const MODEL_MAX_BYTES = 15 * 1024 * 1024;
/** Longest side and total pixels: stops "decompression bombs" (tiny files, huge images). */
export const MAX_SIDE = 8000;
export const MAX_PIXELS = 40_000_000;

export type Sanitized =
  | { ok: true; bytes: Uint8Array; width?: number; height?: number }
  | { ok: false; error: string };

const fail = (error: string): Sanitized => ({ ok: false, error });

/* ------------------------------------------------------------------ helpers */

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u32le = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function checkDimensions(width: number, height: number): string | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return "The image has no valid size.";
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    return `Images can be at most ${MAX_SIDE} pixels on each side. Resize it and try again.`;
  }
  return null;
}

/**
 * Byte patterns that never belong in a picture: markup, scripts and server-side code. All are at
 * least five characters, so random compressed pixel data almost never matches one by chance
 * (shorter ones such as "<svg" would wrongly reject about 1 in 100 large photos).
 */
const SUSPICIOUS = ["<script", "<?php", "<html", "<iframe", "<body", "<object", "<embed", "javascript:", "onerror=", "onload="].map(
  (s) => new TextEncoder().encode(s)
);

/** True if the bytes contain a script/markup marker (ASCII case-insensitive). */
export function containsMarkup(bytes: Uint8Array): boolean {
  const lower = (c: number) => (c >= 65 && c <= 90 ? c + 32 : c);
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0x3c && lower(bytes[i]) !== 0x6a && lower(bytes[i]) !== 0x6f) continue; // '<', 'j', 'o'
    for (const pat of SUSPICIOUS) {
      if (i + pat.length > bytes.length) continue;
      let match = true;
      for (let k = 0; k < pat.length; k++) {
        if (lower(bytes[i + k]) !== pat[k]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }
  return false;
}

/* ---------------------------------------------------------------------- PNG */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Chunks needed to draw the picture correctly. Everything else (text, EXIF, time, unknown) goes. */
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "pHYs", "bKGD", "acTL", "fcTL", "fdAT"]);

export function sanitizePng(b: Uint8Array): Sanitized {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 8 + 25 || SIG.some((v, i) => b[i] !== v)) return fail("That file is not a real PNG image.");
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  let pos = 8;
  let width = 0;
  let height = 0;
  let sawEnd = false;
  let first = true;
  while (pos + 12 <= b.length) {
    const len = u32be(b, pos);
    const type = ascii(b, pos + 4, pos + 8);
    const end = pos + 12 + len;
    if (!/^[A-Za-z]{4}$/.test(type) || end > b.length) return fail("The PNG image is damaged.");
    if (crc32(b.subarray(pos + 4, pos + 8 + len)) !== u32be(b, pos + 8 + len)) return fail("The PNG image is damaged.");
    if (first) {
      if (type !== "IHDR" || len !== 13) return fail("The PNG image is damaged.");
      width = u32be(b, pos + 8);
      height = u32be(b, pos + 12);
      first = false;
    }
    if (PNG_KEEP.has(type)) keep.push(b.subarray(pos, end));
    pos = end;
    if (type === "IEND") {
      sawEnd = true;
      break; // anything after IEND is dropped
    }
  }
  if (!sawEnd) return fail("The PNG image is incomplete.");
  const dim = checkDimensions(width, height);
  if (dim) return fail(dim);
  return { ok: true, bytes: concat(keep), width, height };
}

/* --------------------------------------------------------------------- JPEG */

/** Reads the EXIF orientation (1–8) from an APP1 segment, if it has one. */
function exifOrientation(seg: Uint8Array): number | null {
  // seg = "Exif\0\0" + TIFF
  if (seg.length < 14 || ascii(seg, 0, 6) !== "Exif\0\0") return null;
  const t = seg.subarray(6);
  const le = t[0] === 0x49 && t[1] === 0x49;
  if (!le && !(t[0] === 0x4d && t[1] === 0x4d)) return null;
  const r16 = (i: number) => (le ? t[i] | (t[i + 1] << 8) : (t[i] << 8) | t[i + 1]);
  const r32 = (i: number) => (le ? u32le(t, i) : u32be(t, i));
  const ifd = r32(4);
  if (ifd + 2 > t.length) return null;
  const count = r16(ifd);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > t.length) return null;
    if (r16(e) === 0x0112) {
      const v = r16(e + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

/** A minimal EXIF block holding only the orientation, so phone photos stay the right way up. */
function orientationOnlyExif(orientation: number): Uint8Array {
  const body = [
    ...[0x45, 0x78, 0x69, 0x66, 0x00, 0x00], // "Exif\0\0"
    ...[0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08], // big-endian TIFF, IFD0 at 8
    ...[0x00, 0x01], // one entry
    ...[0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00], // Orientation SHORT
    ...[0x00, 0x00, 0x00, 0x00], // no next IFD
  ];
  const len = body.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff, ...body]);
}

export function sanitizeJpeg(b: Uint8Array): Sanitized {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return fail("That file is not a real JPEG image.");
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let pos = 2;
  let width = 0;
  let height = 0;
  let orientation: number | null = null;
  let sawSof = false;
  let sawScan = false;
  let sawEnd = false;

  while (pos < b.length) {
    if (b[pos] !== 0xff) return fail("The JPEG image is damaged.");
    while (b[pos] === 0xff && pos < b.length) pos++; // fill bytes
    const marker = b[pos++];
    if (marker === 0xd9) {
      keep.push(new Uint8Array([0xff, 0xd9]));
      sawEnd = true;
      break; // anything after the end-of-image marker is dropped
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) return fail("The JPEG image is damaged.");
    if (pos + 2 > b.length) return fail("The JPEG image is incomplete.");
    const len = u16be(b, pos);
    const segEnd = pos + len;
    if (len < 2 || segEnd > b.length) return fail("The JPEG image is damaged.");
    const data = b.subarray(pos + 2, segEnd);
    const whole = b.subarray(pos - 2, segEnd);

    const isSof = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (data.length < 6) return fail("The JPEG image is damaged.");
      height = u16be(data, 1);
      width = u16be(data, 3);
      sawSof = true;
      keep.push(whole);
    } else if (marker === 0xc4 || marker === 0xdb || marker === 0xdd || marker === 0xcc) {
      keep.push(whole); // Huffman tables, quantisation tables, restart interval, arithmetic tables
    } else if (marker === 0xe0 && ascii(data, 0, 5) === "JFIF\0") {
      keep.push(whole);
    } else if (marker === 0xee && ascii(data, 0, 5) === "Adobe") {
      keep.push(whole); // colour transform flag, needed to decode some CMYK/RGB files
    } else if (marker === 0xe2 && ascii(data, 0, 12) === "ICC_PROFILE\0") {
      keep.push(whole); // colour profile
    } else if (marker === 0xe1) {
      orientation = orientation ?? exifOrientation(data); // EXIF/XMP dropped; orientation kept below
    } else if (marker === 0xda) {
      keep.push(whole);
      sawScan = true;
      // Entropy-coded image data runs until the next marker that is not a stuffed byte or restart.
      let p = segEnd;
      while (p < b.length) {
        if (b[p] === 0xff && p + 1 < b.length) {
          const n = b[p + 1];
          if (n !== 0x00 && !(n >= 0xd0 && n <= 0xd7) && n !== 0xff) break;
        }
        p++;
      }
      keep.push(b.subarray(segEnd, p));
      pos = p;
      continue;
    }
    // Everything else (APP3–APP15, comments, unknown segments) is dropped.
    pos = segEnd;
  }

  if (!sawSof || !sawScan || !sawEnd) return fail("The JPEG image is incomplete.");
  const dim = checkDimensions(width, height);
  if (dim) return fail(dim);
  if (orientation && orientation !== 1) {
    // After the JFIF header when there is one, which is where readers expect EXIF.
    const afterJfif = keep[1]?.[1] === 0xe0 ? 2 : 1;
    keep.splice(afterJfif, 0, orientationOnlyExif(orientation));
  }
  return { ok: true, bytes: concat(keep), width, height };
}

/* --------------------------------------------------------------------- WebP */

const WEBP_KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"]);

export function sanitizeWebp(b: Uint8Array): Sanitized {
  if (b.length < 20 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WEBP") return fail("That file is not a real WebP image.");
  const riffEnd = 8 + u32le(b, 4);
  if (riffEnd > b.length || riffEnd < 20) return fail("The WebP image is damaged.");
  const chunks: Uint8Array[] = [];
  let pos = 12;
  let width = 0;
  let height = 0;
  let hasImage = false;
  while (pos + 8 <= riffEnd) {
    const type = ascii(b, pos, pos + 4);
    const size = u32le(b, pos + 4);
    const end = pos + 8 + size + (size & 1);
    if (end > riffEnd) return fail("The WebP image is damaged.");
    const data = b.subarray(pos + 8, pos + 8 + size);
    if (type === "VP8X" && size >= 10) {
      width = 1 + (data[4] | (data[5] << 8) | (data[6] << 16));
      height = 1 + (data[7] | (data[8] << 8) | (data[9] << 16));
      const flags = new Uint8Array(b.subarray(pos, end));
      flags[8] &= ~(0x08 | 0x04); // clear the EXIF and XMP "present" flags: those chunks are dropped
      chunks.push(flags);
    } else if (WEBP_KEEP.has(type)) {
      if (type === "VP8 " && size >= 10 && !width) {
        width = (data[6] | (data[7] << 8)) & 0x3fff;
        height = (data[8] | (data[9] << 8)) & 0x3fff;
      }
      if (type === "VP8L" && size >= 5 && !width) {
        const bits = u32le(data, 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      if (type === "VP8 " || type === "VP8L" || type === "ANMF") hasImage = true;
      chunks.push(b.subarray(pos, end));
    }
    pos = end;
  }
  if (!hasImage) return fail("The WebP image has no picture in it.");
  const dim = checkDimensions(width, height);
  if (dim) return fail(dim);
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 4));
  const riffSize = body.length + 4;
  header.set([riffSize & 0xff, (riffSize >> 8) & 0xff, (riffSize >> 16) & 0xff, (riffSize >>> 24) & 0xff], 4);
  header.set(b.subarray(8, 12), 8);
  return { ok: true, bytes: concat([header, body]), width, height };
}

/* ---------------------------------------------------------------- 3D models */

/** glTF may only reference data embedded in the file itself, never another URL. */
function checkGltfJson(json: unknown): string | null {
  if (!json || typeof json !== "object") return "The 3D model is damaged.";
  const doc = json as { asset?: { version?: unknown }; buffers?: { uri?: unknown }[]; images?: { uri?: unknown }[] };
  if (typeof doc.asset?.version !== "string" || !doc.asset.version.startsWith("2")) return "Only glTF 2.0 models are supported.";
  for (const ref of [...(doc.buffers ?? []), ...(doc.images ?? [])]) {
    if (ref?.uri !== undefined && !(typeof ref.uri === "string" && /^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(ref.uri))) {
      return "The 3D model links to outside files. Export it as a single .glb file instead.";
    }
  }
  return null;
}

export function sanitizeGlb(b: Uint8Array): Sanitized {
  if (b.length < 20 || ascii(b, 0, 4) !== "glTF") return fail("That file is not a real GLB model.");
  if (u32le(b, 4) !== 2) return fail("Only glTF 2.0 (.glb) models are supported.");
  const total = u32le(b, 8);
  if (total !== b.length) return fail("The GLB model is damaged.");
  const jsonLen = u32le(b, 12);
  if (ascii(b, 16, 20) !== "JSON" || 20 + jsonLen > b.length) return fail("The GLB model is damaged.");
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(20, 20 + jsonLen)));
  } catch {
    return fail("The GLB model is damaged.");
  }
  const problem = checkGltfJson(json);
  if (problem) return fail(problem);
  if (containsMarkup(b.subarray(20, 20 + jsonLen))) return fail("The 3D model contains code, which is not allowed.");
  return { ok: true, bytes: b };
}

export function sanitizeGltf(b: Uint8Array): Sanitized {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(b).replace(/^﻿/, ""));
  } catch {
    return fail("That file is not a valid glTF model.");
  }
  const problem = checkGltfJson(json);
  if (problem) return fail(problem);
  if (containsMarkup(b)) return fail("The 3D model contains code, which is not allowed.");
  // Re-serialise so only the parsed JSON is stored (no trailing bytes, no comments).
  return { ok: true, bytes: new TextEncoder().encode(JSON.stringify(json)) };
}

/* -------------------------------------------------------------------- entry */

export function maxBytesFor(kind: UploadKind): number {
  return kind === "glb" || kind === "gltf" ? MODEL_MAX_BYTES : IMAGE_MAX_BYTES;
}

/** Parses, rebuilds and scans one upload. Only the returned bytes may be stored. */
export function sanitizeUpload(kind: UploadKind, bytes: Uint8Array): Sanitized {
  if (bytes.length > maxBytesFor(kind)) {
    return fail(kind === "glb" || kind === "gltf" ? "3D models must be 15 MB or smaller." : "Images must be 6 MB or smaller.");
  }
  const result =
    kind === "png" ? sanitizePng(bytes)
    : kind === "jpg" ? sanitizeJpeg(bytes)
    : kind === "webp" ? sanitizeWebp(bytes)
    : kind === "glb" ? sanitizeGlb(bytes)
    : sanitizeGltf(bytes);
  if (!result.ok) return result;
  if (kind !== "glb" && kind !== "gltf" && containsMarkup(result.bytes)) {
    return fail("This image contains hidden code, so it was not uploaded.");
  }
  return result;
}
