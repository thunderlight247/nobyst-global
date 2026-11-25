import { NextResponse } from "next/server";
import { getEnv } from "./cloudflare";
import { maxBytesFor, MODEL_MAX_BYTES, sanitizeUpload, type UploadKind } from "./upload-sanitize";

const EXTENSIONS: Record<string, UploadKind> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
};

/** The only content types files are ever served with, decided by the stored extension. */
export const CONTENT_TYPES: Record<UploadKind, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
};

/** Room for the multipart wrapper around the largest allowed file. */
const MAX_REQUEST_BYTES = MODEL_MAX_BYTES + 64 * 1024;

export type Uploader = { id: string; email: string; role: string };

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A file name that is safe to show in the admin: no paths, control characters or markup. */
function displayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f<>"]/g, "").trim().slice(0, 120);
  return clean || "unnamed";
}

/**
 * Stores one uploaded photo or 3D model for an admin or partner:
 * 1. refuses oversized requests before reading them (6 MB images, 15 MB models);
 * 2. parses the whole file and rebuilds images with only the picture data (upload-sanitize.ts);
 * 3. saves it under a random name (m/<uuid>.<ext>) that reveals nothing about the file or uploader;
 * 4. records the original name, uploader, size and fingerprint in the private media register.
 */
export async function storeUpload(request: Request, uploader: Uploader): Promise<NextResponse> {
  try {
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Images must be 6 MB or smaller, 3D models 15 MB." }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image or 3D model file to upload." }, { status: 400 });
    }

    // The type from the browser or the file name is only a hint; sanitizeUpload decides.
    let kind: UploadKind | undefined = EXTENSIONS[file.type];
    if (!kind) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".glb")) kind = "glb";
      else if (lower.endsWith(".gltf")) kind = "gltf";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) kind = "jpg";
      else if (lower.endsWith(".png")) kind = "png";
      else if (lower.endsWith(".webp")) kind = "webp";
    }
    if (!kind) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP image, or a GLB/glTF 3D model." }, { status: 415 });
    }
    if (file.size > maxBytesFor(kind)) {
      return NextResponse.json(
        { error: kind === "glb" || kind === "gltf" ? "3D models must be 15 MB or smaller." : "Images must be 6 MB or smaller." },
        { status: 413 }
      );
    }

    const original = new Uint8Array(await file.arrayBuffer());
    const cleaned = sanitizeUpload(kind, original);
    if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 415 });

    const key = `m/${crypto.randomUUID()}.${kind}`;
    const { MEDIA, DB } = await getEnv();
    await MEDIA.put(key, cleaned.bytes, {
      httpMetadata: { contentType: CONTENT_TYPES[kind], cacheControl: "public, max-age=31536000, immutable" },
    });
    try {
      await DB.prepare(
        `INSERT INTO media_uploads (key, original_name, uploader_id, uploader_email, uploader_role, content_type,
           size_bytes, original_size_bytes, width, height, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          key,
          displayName(file.name),
          uploader.id,
          uploader.email,
          uploader.role,
          CONTENT_TYPES[kind],
          cleaned.bytes.length,
          original.length,
          cleaned.width ?? null,
          cleaned.height ?? null,
          await sha256Hex(cleaned.bytes)
        )
        .run();
    } catch (err) {
      // Without a register entry nobody could own or identify the file, so do not keep it.
      await MEDIA.delete(key).catch(() => undefined);
      console.error("media register write failed (run migration 0019?)", err);
      return NextResponse.json({ error: "The file could not be saved. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ url: `/api/media/${key}` }, { status: 201 });
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json({ error: "The file could not be uploaded. Please try again." }, { status: 500 });
  }
}

export type MediaUpload = {
  key: string;
  url: string;
  originalName: string;
  uploaderEmail: string | null;
  uploaderRole: string | null;
  contentType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  createdAt: string;
  usedBy: string[];
};

/** The private register for the admin Media tab, newest first, with the products using each file. */
export async function listMediaUploads(limit = 300): Promise<MediaUpload[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(`SELECT * FROM media_uploads ORDER BY created_at DESC LIMIT ${Math.min(Math.max(limit, 1), 1000)}`).all<{
      key: string;
      original_name: string;
      uploader_email: string | null;
      uploader_role: string | null;
      content_type: string;
      size_bytes: number;
      original_size_bytes: number;
      width: number | null;
      height: number | null;
      sha256: string;
      created_at: string;
    }>();
    const { results: products } = await DB.prepare("SELECT name, image, gallery, model_3d_url FROM products").all<{
      name: string;
      image: string;
      gallery: string;
      model_3d_url: string | null;
    }>();
    return results.map((r) => {
      const url = `/api/media/${r.key}`;
      return {
        key: r.key,
        url,
        originalName: r.original_name,
        uploaderEmail: r.uploader_email,
        uploaderRole: r.uploader_role,
        contentType: r.content_type,
        sizeBytes: r.size_bytes,
        originalSizeBytes: r.original_size_bytes,
        width: r.width,
        height: r.height,
        sha256: r.sha256,
        createdAt: r.created_at,
        usedBy: products.filter((p) => p.image === url || p.model_3d_url === url || p.gallery.includes(JSON.stringify(url))).map((p) => p.name),
      };
    });
  } catch (err) {
    console.warn("Could not load the media register (run migration 0019?)", err);
    return [];
  }
}

/**
 * Whether a partner may use this media path on a product: files they uploaded (register), or files
 * in their old per-partner folder from before the register existed.
 */
export async function partnerOwnsMedia(partnerId: string, path: string): Promise<boolean> {
  if (path.startsWith(`/api/media/partners/${partnerId}/`)) return true;
  if (!path.startsWith("/api/media/m/")) return false;
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT 1 AS x FROM media_uploads WHERE key = ? AND uploader_id = ?")
    .bind(decodeURIComponent(path.slice("/api/media/".length)), partnerId)
    .first()
    .catch(() => null);
  return Boolean(row);
}
