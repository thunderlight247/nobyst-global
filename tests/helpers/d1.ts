import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CloudflareEnv, D1Database } from "@/lib/cloudflare";

const ROOT = path.resolve(__dirname, "../..");

/**
 * An in-memory SQLite database with the real schema and migrations, behind the same small
 * prepare/bind/first/all/run surface the app uses from Cloudflare D1. Lets tests run the app's
 * actual SQL (upserts, RETURNING, atomic claims) without Cloudflare.
 */
export function createTestDb(): { db: D1Database; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec(readFileSync(path.join(ROOT, "db/schema.sql"), "utf8"));
  const migrations = readdirSync(path.join(ROOT, "db/migrations"))
    .filter((f) => f.endsWith(".sql"))
    // 0002's columns are already folded into schema.sql.
    .filter((f) => !f.startsWith("0002_"))
    .sort();
  for (const file of migrations) raw.exec(readFileSync(path.join(ROOT, "db/migrations", file), "utf8"));

  const db: D1Database = {
    prepare(sql: string) {
      let values: unknown[] = [];
      const stmt = () => raw.prepare(sql);
      const params = () => values.map((v) => (v === undefined ? null : v)) as never[];
      const api = {
        bind(...v: unknown[]) {
          values = v;
          return api;
        },
        async first<T>() {
          return (stmt().get(...params()) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: stmt().all(...params()) as T[] };
        },
        async run() {
          const r = stmt().run(...params());
          return { success: true, meta: { changes: Number(r.changes) } };
        },
      };
      return api;
    },
  };
  return { db, raw };
}

/** A test env: real SQL, no secrets unless a test adds them. */
export function createTestEnv(overrides: Partial<CloudflareEnv> = {}): CloudflareEnv {
  const { db } = createTestDb();
  return {
    DB: db,
    MEDIA: { put: async () => undefined, get: async () => null, delete: async () => undefined },
    SITE_URL: "https://shop.test",
    ...overrides,
  };
}
