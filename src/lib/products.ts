import { categories, phoneGroups, type PhoneGroupId } from "@/data/site";
import { getEnv } from "./cloudflare";

export type Category = (typeof categories)[number];

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  features: string[];
  image: string;
  imageAlt: string;
  fits: PhoneGroupId[];
  sortOrder: number;
};

export type ProductInput = {
  name: string;
  category: Category;
  description: string;
  features: string[];
  image: string;
  imageAlt: string;
  fits: PhoneGroupId[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  features: string;
  image: string;
  image_alt: string;
  fits: string;
  sort_order: number;
};

const CATEGORY_SET = new Set<string>(categories);
const FIT_SET = new Set<string>(phoneGroups.map((g) => g.id));

function parseList(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: (CATEGORY_SET.has(row.category) ? row.category : categories[0]) as Category,
    description: row.description,
    features: parseList(row.features),
    image: row.image,
    imageAlt: row.image_alt,
    fits: parseList(row.fits).filter((f): f is PhoneGroupId => FIT_SET.has(f)),
    sortOrder: row.sort_order,
  };
}

export async function listProducts(): Promise<Product[]> {
  const { DB } = await getEnv();
  const { results } = await DB.prepare(
    "SELECT * FROM products ORDER BY sort_order ASC, name ASC"
  ).all<ProductRow>();
  return results.map(mapRow);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT * FROM products WHERE slug = ?").bind(slug).first<ProductRow>();
  return row ? mapRow(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<ProductRow>();
  return row ? mapRow(row) : null;
}

export async function listRelated(category: string, excludeId: string): Promise<Product[]> {
  const { DB } = await getEnv();
  const { results } = await DB.prepare("SELECT * FROM products WHERE category = ? AND id <> ? ORDER BY sort_order ASC LIMIT 3"
  )
    .bind(category, excludeId)
    .all<ProductRow>();
  return results.map(mapRow);
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "product";
}

async function uniqueSlug(title: string): Promise<string> {
  const { DB } = await getEnv();
  const base = slugify(title);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const hit = await DB.prepare("SELECT 1 AS x FROM products WHERE slug = ?").bind(candidate).first();
    if (!hit) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Validates untrusted JSON from the admin form. */
export function parseProductInput(raw: unknown): { ok: true; value: ProductInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request body." };
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 80) return { ok: false, error: "Name must be 3–80 characters." };

  const category = typeof body.category === "string" ? body.category : "";
  if (!CATEGORY_SET.has(category)) return { ok: false, error: "Choose a valid category." };

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 5 || description.length > 400)
    return { ok: false, error: "Description must be 5–400 characters." };

  if (!Array.isArray(body.features)) return { ok: false, error: "Features must be a list." };
  const features = body.features
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.trim())
    .filter(Boolean);
  if (features.length < 1 || features.length > 8)
    return { ok: false, error: "Add between 1 and 8 features." };
  if (features.some((f) => f.length > 140)) return { ok: false, error: "Each feature must be 140 characters or fewer." };

  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (!image.startsWith("/") || image.length > 500)
    return { ok: false, error: "Upload an image or choose an existing one." };

  const imageAlt = typeof body.imageAlt === "string" ? body.imageAlt.trim() : "";
  if (imageAlt.length < 3 || imageAlt.length > 160)
    return { ok: false, error: "Image description must be 3–160 characters." };

  if (!Array.isArray(body.fits)) return { ok: false, error: "Choose at least one phone family." };
  const fits = body.fits.filter((f): f is PhoneGroupId => typeof f === "string" && FIT_SET.has(f));
  if (fits.length < 1) return { ok: false, error: "Choose at least one phone family." };

  return {
    ok: true,
    value: { name, category: category as Category, description, features, image, imageAlt, fits },
  };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(input.name);
  const row = await DB.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max FROM products").first<{ max: number }>();
  const sortOrder = (row?.max ?? 0) + 1;

  await DB.prepare(
    `INSERT INTO products (id, slug, name, category, description, features, image, image_alt, fits, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      slug,
      input.name,
      input.category,
      input.description,
      JSON.stringify(input.features),
      input.image,
      input.imageAlt,
      JSON.stringify(input.fits),
      sortOrder
    )
    .run();

  const created = await getProductById(id);
  if (!created) throw new Error("Product could not be created.");
  return created;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product | null> {
  const { DB } = await getEnv();
  const existing = await getProductById(id);
  if (!existing) return null;

  await DB.prepare(
    `UPDATE products
     SET name = ?, category = ?, description = ?, features = ?, image = ?, image_alt = ?, fits = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.name,
      input.category,
      input.description,
      JSON.stringify(input.features),
      input.image,
      input.imageAlt,
      JSON.stringify(input.fits),
      id
    )
    .run();

  return getProductById(id);
}

/** Deletes the product row and any R2 media that was uploaded for it. */
export async function deleteProduct(id: string): Promise<boolean> {
  const { DB, MEDIA } = await getEnv();
  const existing = await getProductById(id);
  if (!existing) return false;

  await DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();

  const prefix = "/api/media/";
  if (existing.image.startsWith(prefix)) {
    const key = decodeURIComponent(existing.image.slice(prefix.length));
    if (key.startsWith("products/")) {
      try {
        await MEDIA.delete(key);
      } catch {
        // The row is already gone; a leftover object should not fail the request.
      }
    }
  }

  return true;
}

/** Rejects orphaning an uploaded image when it is replaced during an edit. */
export async function deleteReplacedMedia(previous: string, next: string): Promise<void> {
  const prefix = "/api/media/";
  if (!previous.startsWith(prefix) || previous === next) return;
  const key = decodeURIComponent(previous.slice(prefix.length));
  if (!key.startsWith("products/")) return;
  const { MEDIA } = await getEnv();
  try {
    await MEDIA.delete(key);
  } catch {
    // Non-fatal: the product now points at the new image.
  }
}
