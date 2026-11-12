import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "application/octet-stream": "glb", // common fallback for .glb files
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image or 3D model file to upload." }, { status: 400 });
    }

    // Determine extension by mime type or file name
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

    const contentType =
      extension === "glb"
        ? "model/gltf-binary"
        : extension === "gltf"
        ? "model/gltf+json"
        : file.type || "application/octet-stream";

    const key = `products/${crypto.randomUUID()}.${extension}`;
    const { MEDIA } = await getEnv();
    await MEDIA.put(key, await file.arrayBuffer(), {
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
