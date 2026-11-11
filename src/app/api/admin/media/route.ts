import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    }
    const extension = EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be 6 MB or smaller." }, { status: 413 });
    }

    const key = `products/${crypto.randomUUID()}.${extension}`;
    const { MEDIA } = await getEnv();
    await MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return NextResponse.json({ url: `/api/media/${key}` }, { status: 201 });
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json({ error: "The image could not be uploaded. Please try again." }, { status: 500 });
  }
}
