import { getEnv } from "./cloudflare";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
};

function mapRow(row: CategoryRow): CategoryNode {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
  };
}

/** Every category, top-level and sub-categories, in display order. */
export async function listCategories(): Promise<CategoryNode[]> {
  const { DB } = await getEnv();
  const { results } = await DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC, name ASC"
  ).all<CategoryRow>();
  return results.map(mapRow);
}

/** Category names only, used by product validation and the product form. */
export async function listCategoryNames(): Promise<string[]> {
  return (await listCategories()).map((c) => c.name);
}

export type CategoryInput = {
  name: string;
  parentId: string | null;
  sortOrder: number;
};

/** Validates untrusted JSON from the admin Categories tab. */
export function parseCategoryInput(
  raw: unknown
): { ok: true; value: CategoryInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request body." };
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Name must be 2–60 characters." };

  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;

  const sortOrder = Number(body.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999)
    return { ok: false, error: "Order must be a whole number from 0 to 9999." };

  return { ok: true, value: { name, parentId, sortOrder } };
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "category"
  );
}

/**
 * Checks the one-level rule: a parent must be top-level, a category that has
 * sub-categories cannot itself become a sub-category, and a category cannot be its own parent.
 */
async function checkParent(id: string | null, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  if (parentId === id) return "A category cannot be its own parent.";

  const { DB } = await getEnv();
  const parent = await DB.prepare("SELECT id, parent_id FROM categories WHERE id = ?")
    .bind(parentId)
    .first<{ id: string; parent_id: string | null }>();
  if (!parent) return "The parent category does not exist.";
  if (parent.parent_id) return "Sub-categories can only sit one level below a top-level category.";

  if (id) {
    const children = await DB.prepare("SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?")
      .bind(id)
      .first<{ n: number }>();
    if ((children?.n ?? 0) > 0)
      return "This category has sub-categories, so it cannot be moved under another category.";
  }
  return null;
}

export async function createCategory(input: CategoryInput): Promise<CategoryNode | { error: string }> {
  const problem = await checkParent(null, input.parentId);
  if (problem) return { error: problem };

  const { DB } = await getEnv();
  const base = slugify(input.name);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const hit = await DB.prepare("SELECT 1 AS x FROM categories WHERE slug = ?").bind(slug).first();
    if (!hit) break;
    slug = `${base}-${i}`;
  }

  const id = `cat_${crypto.randomUUID()}`;
  await DB.prepare(
    "INSERT INTO categories (id, slug, name, description, parent_id, sort_order) VALUES (?, ?, ?, NULL, ?, ?)"
  )
    .bind(id, slug, input.name, input.parentId, input.sortOrder)
    .run();

  return {
    id,
    slug,
    name: input.name,
    description: null,
    parentId: input.parentId,
    sortOrder: input.sortOrder,
  };
}

/**
 * Updates a category. Products store the category name, so a rename also
 * updates the products that use the old name, in the same batch.
 */
export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<CategoryNode | { error: string } | null> {
  const { DB } = await getEnv();
  const existing = await DB.prepare("SELECT * FROM categories WHERE id = ?")
    .bind(id)
    .first<CategoryRow>();
  if (!existing) return null;

  const problem = await checkParent(id, input.parentId);
  if (problem) return { error: problem };

  await DB.prepare("UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?")
    .bind(input.name, input.parentId, input.sortOrder, id)
    .run();
  if (existing.name !== input.name) {
    await DB.prepare("UPDATE products SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?")
      .bind(input.name, existing.name)
      .run();
  }

  return {
    id,
    slug: existing.slug,
    name: input.name,
    description: existing.description,
    parentId: input.parentId,
    sortOrder: input.sortOrder,
  };
}
