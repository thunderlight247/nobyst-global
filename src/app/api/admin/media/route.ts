import { NextResponse } from "next/server";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/cloudflare";
import { matchesSignature } from "@/lib/media";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
};

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const user = await getCurrentUser();
    const limited = await rateLimit([[`upload:user:${user?.id}`, LIMITS.uploadUser]]);
    if (limited) return limited;

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image or 3D model file to upload." }, { status: 400 });
    }

    // Determine extension by mime type, else by file name (browsers often send .glb as
    // application/octet-stream). The byte check below is what actually decides.
    let extension = EXTENSIONS[file.type];
    if (!extension) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".glb")) extension = "glb";
      else if (lower.endsWith(".gltf")) extension = "gltf";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) extension = "jpg";
      else if (lower.endsWith(".png")) extension = "png";
      else if (lower.endsWith(".webp")) extension = "webp";
    }

    if (!extension) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, WebP image or GLB/GLTF 3D model." },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Files must be 15 MB or smaller." }, { status: 413 });
    }

    // Check the file's leading bytes. The browser-supplied type and name are only hints, so a
    // renamed HTML or script file cannot be stored and served from our origin.
    const bytes = await file.arrayBuffer();
    if (!matchesSignature(new Uint8Array(bytes.slice(0, 16)), extension)) {
      return NextResponse.json(
        { error: "That file's contents do not match its type. Use a real JPG, PNG, WebP or GLB/GLTF file." },
        { status: 415 }
      );
    }

    const contentType =
      extension === "glb"
        ? "model/gltf-binary"
        : extension === "gltf"
        ? "model/gltf+json"
        : extension === "jpg"
        ? "image/jpeg"
        : `image/${extension}`;

    const key = `products/${crypto.randomUUID()}.${extension}`;
    const { MEDIA } = await getEnv();
    await MEDIA.put(key, bytes, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return NextResponse.json({ url: `/api/media/${key}` }, { status: 201 });
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json({ error: "The image could not be uploaded. Please try again." }, { status: 500 });
  }
}
