import { getEnv } from "./cloudflare";
import { CONTENT_BLOCKS, MAX_BLOCK_LENGTH, type ContentKey, type ContentValues } from "./content-blocks";

export { CONTENT_BLOCKS, MAX_BLOCK_LENGTH };
export type { ContentKey, ContentValues };

/** Current values for every block, falling back to the defaults. */
export async function getContent(): Promise<ContentValues> {
  const values = Object.fromEntries(CONTENT_BLOCKS.map((b) => [b.key, b.defaultValue])) as ContentValues;
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare("SELECT key, value FROM content_blocks").all<{
      key: string;
      value: string;
    }>();
    for (const row of results) {
      if (row.key in values) values[row.key as ContentKey] = row.value;
    }
  } catch (error) {
    console.error("Could not load content blocks, using defaults", error);
  }
  return values;
}

/** Validates an untrusted key and value from the admin. Returns an error if it is not a known block. */
export function parseContentInput(
  key: unknown,
  value: unknown
): { ok: true; key: ContentKey; value: string } | { ok: false; error: string } {
  const block = CONTENT_BLOCKS.find((b) => b.key === key);
  if (!block) return { ok: false, error: "Unknown content block." };
  if (typeof value !== "string") return { ok: false, error: "Text must be a string." };
  const clean = value.trim();
  if (clean.length === 0) return { ok: false, error: "Text cannot be empty." };
  if (clean.length > MAX_BLOCK_LENGTH)
    return { ok: false, error: `Text must be ${MAX_BLOCK_LENGTH} characters or fewer.` };
  return { ok: true, key: block.key, value: clean };
}

export async function saveContent(key: ContentKey, value: string): Promise<void> {
  const { DB } = await getEnv();
  await DB.prepare(
    "INSERT INTO content_blocks (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
  )
    .bind(key, value)
    .run();
}
