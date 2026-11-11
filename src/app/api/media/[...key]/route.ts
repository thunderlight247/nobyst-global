import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  if (!key.startsWith("products/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const { MEDIA } = await getEnv();
  const object = await MEDIA.get(key).catch(() => null);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { headers });
}
