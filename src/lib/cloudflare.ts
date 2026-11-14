import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal structural types for the two bindings this app uses.
 * Kept local so the project does not depend on generated Workers types.
 */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | Blob,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

export type CloudflareEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  /** Paystack secret key, set with `wrangler secret put PAYSTACK_SECRET_KEY`. Server-only. */
  PAYSTACK_SECRET_KEY?: string;
  /** Resend API key for transactional email. Set with `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY?: string;
  /** Verified sender, e.g. "NOBYST GLOBAL <no-reply@yourdomain.com>". Plain var in wrangler. */
  EMAIL_FROM?: string;
  /** Public site origin used in email links, e.g. https://nobyst-global.example.workers.dev */
  SITE_URL?: string;
};

/** Bindings from wrangler.jsonc (local miniflare in dev, Workers in production). */
export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as CloudflareEnv;
}
