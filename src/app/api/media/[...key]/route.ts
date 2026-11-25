import { getEnv } from "@/lib/cloudflare";
import { CONTENT_TYPES } from "@/lib/media-upload";
import type { UploadKind } from "@/lib/upload-sanitize";

export const dynamic = "force-dynamic";

/** Uploaded files are only ever served from these folders: m/ (current), products/ and partners/ (older uploads). */
const KEY = /^(m\/[0-9a-f-]{36}|products\/[0-9a-f-]{36}|partners\/[0-9a-f-]{36}\/[0-9a-f-]{36})\.(jpg|png|webp|glb|gltf)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const match = KEY.exec(key);
  if (!match) return new Response("Not found", { status: 404 });

  const { MEDIA } = await getEnv();
  const object = await MEDIA.get(key).catch(() => null);
  if (!object) return new Response("Not found", { status: 404 });

  const kind = match[2] as UploadKind;
  const headers = new Headers({
    // The type comes from the file extension we chose, never from what was stored or uploaded.
    "content-type": CONTENT_TYPES[kind],
    etag: object.httpEtag,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    // Even if a file were somehow not an image, a browser opening it directly could run nothing.
    "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    "content-disposition": `inline; filename="nobyst-media.${kind}"`,
    "cross-origin-resource-policy": "cross-origin",
  });
  return new Response(object.body, { headers });
}
