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
};

/** Bindings from wrangler.jsonc (local miniflare in dev, Workers in production). */
export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as CloudflareEnv;
}
