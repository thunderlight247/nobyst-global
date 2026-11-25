import { phoneGroups, type PhoneGroupId } from "@/data/site";
import { DEFAULT_STOCK_STATUS, isStockStatus, type StockStatus } from "./catalogue";
import { listCategoryNames } from "./categories";
import { getEnv } from "./cloudflare";

export type Category = string;

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  features: string[];
  image: string;
  /** Extra photos shown under the main one on the product page. */
  gallery: string[];
  /** Optional 3D GLB/GLTF model URL in Cloudflare R2 or CDN */
  model3dUrl?: string | null;
  /** Available color variants (names or hex codes e.g. ["Black", "Gold", "Blue"]) */
  colors: string[];
  /** Price in pesewas; null means the price has not been set yet. */
  pricePesewas: number | null;
  stockStatus: StockStatus;
  imageAlt: string;
  fits: PhoneGroupId[];
  sortOrder: number;
  /** The partner selling it, or null for NOBYST's own products. */
  partnerId: string | null;
  /** The partner's business name, shown as "Sold by". */
  partnerName: string | null;
  /** live (in the shop), pending (awaiting approval), rejected, or hidden. */
  status: ProductStatus;
  /** The admin's note when a product is rejected or hidden. */
  reviewNote: string | null;
};

export type ProductStatus = "live" | "pending" | "rejected" | "hidden";
export const PRODUCT_STATUSES: ProductStatus[] = ["live", "pending", "rejected", "hidden"];
export function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === "string" && (PRODUCT_STATUSES as string[]).includes(value);
}

export type ProductInput = {
  name: string;
  category: Category;
  description: string;
  features: string[];
  image: string;
  gallery: string[];
  model3dUrl?: string | null;
  colors: string[];
  pricePesewas: number | null;
  stockStatus: StockStatus;
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
  gallery: string;
  model_3d_url?: string | null;
  colors?: string | null;
  price_pesewas: number | null;
  stock_status: string;
  image_alt: string;
  fits: string;
  sort_order: number;
  partner_id?: string | null;
  status?: string | null;
  review_note?: string | null;
  partner_company?: string | null;
};

const FIT_SET = new Set<string>(phoneGroups.map((g) => g.id));
const MEDIA_PREFIX = "/api/media/";
const MAX_GALLERY = 24;

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function mapRow(row: ProductRow, categoryNames: Set<string>): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    features: parseList(row.features),
    image: row.image,
    gallery: parseList(row.gallery),
    model3dUrl: row.model_3d_url || null,
    colors: parseList(row.colors ?? "[]"),
    pricePesewas:
      typeof row.price_pesewas === "number" && row.price_pesewas > 0 ? row.price_pesewas : null,
    stockStatus: isStockStatus(row.stock_status) ? row.stock_status : DEFAULT_STOCK_STATUS,
    imageAlt: row.image_alt,
    fits: parseList(row.fits).filter((f): f is PhoneGroupId => FIT_SET.has(f)),
    sortOrder: row.sort_order,
    partnerId: row.partner_id ?? null,
    partnerName: row.partner_id ? row.partner_company ?? "Partner" : null,
    status: isProductStatus(row.status) ? row.status : "live",
    reviewNote: row.review_note ?? null,
  };
}

/**
 * Shown in the shop: live, and not from a suspended partner. Every public listing and lookup
 * uses this, so pending, rejected and hidden products never reach customers or checkout.
 */
const PUBLIC_FILTER = "p.status = 'live' AND (p.partner_id IS NULL OR u.partner_status IS NULL OR u.partner_status != 'suspended')";

/** Products joined with their seller. `where` is a fixed SQL fragment; values go in `binds`. */
async function queryProducts(where: string, binds: unknown[], tail = "ORDER BY p.sort_order ASC, p.name ASC"): Promise<ProductRow[]> {
  const { DB } = await getEnv();
  try {
    const { results } = await DB.prepare(
      `SELECT p.*, u.company AS partner_company FROM products p LEFT JOIN users u ON u.id = p.partner_id
       WHERE ${where} ${tail}`
    )
      .bind(...binds)
      .all<ProductRow>();
    return results;
  } catch (err) {
    // Before migration 0016 (no partner_id/status columns): every product is NOBYST's and live.
    const legacyWhere = where.replace(PUBLIC_FILTER, "1 = 1");
    if (legacyWhere.includes("partner_id") || legacyWhere.includes("status")) throw err;
    const { results } = await DB.prepare(`SELECT p.* FROM products p WHERE ${legacyWhere} ${tail}`)
      .bind(...binds)
      .all<ProductRow>();
    return results;
  }
}

/** What the shop shows: live products only. */
export async function listProducts(): Promise<Product[]> {
  const names = new Set(await listCategoryNames());
  return (await queryProducts(PUBLIC_FILTER, [])).map((row) => mapRow(row, names));
}

/** Every product in any status, for the admin. */
export async function listAllProducts(): Promise<Product[]> {
  const names = new Set(await listCategoryNames());
  return (await queryProducts("1 = 1", [])).map((row) => mapRow(row, names));
}

/** One partner's own products in any status, for their dashboard. */
export async function listPartnerProducts(partnerId: string): Promise<Product[]> {
  const names = new Set(await listCategoryNames());
  return (await queryProducts("p.partner_id = ?", [partnerId], "ORDER BY p.updated_at DESC")).map((row) =>
    mapRow(row, names)
  );
}

/** A product as the shop sees it: null unless it is live. Used by product pages and checkout. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const [row] = await queryProducts(`p.slug = ? AND ${PUBLIC_FILTER}`, [slug], "LIMIT 1");
  return row ? mapRow(row, new Set(await listCategoryNames())) : null;
}

/** Any product by id, whatever its status (admin and owner checks). */
export async function getProductById(id: string): Promise<Product | null> {
  const [row] = await queryProducts("p.id = ?", [id], "LIMIT 1");
  return row ? mapRow(row, new Set(await listCategoryNames())) : null;
}

export async function listRelated(category: string, excludeId: string): Promise<Product[]> {
  const rows = await queryProducts(`p.category = ? AND p.id <> ? AND ${PUBLIC_FILTER}`, [category, excludeId], "ORDER BY p.sort_order ASC LIMIT 3");
  const names = new Set(await listCategoryNames());
  return rows.map((row) => mapRow(row, names));
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

/** Same-site paths only: "/images/x.jpg" or "/api/media/...". Rejects "//host" and "/\\host". */
function isLocalPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\") &&
    path.length <= 500 &&
    !/[\s"'<>]/.test(path)
  );
}

function parseImagePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  return isLocalPath(path) ? path : null;
}

/** A local path, or an absolute https:// URL. Anything else (javascript:, data:, http:) is dropped. */
function parseModelUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (isLocalPath(url)) return url;
  if (url.length > 500) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Validates untrusted JSON from the admin form. */
/**
 * Validates untrusted JSON from the admin form, or from a partner's dashboard when `mediaPrefix`
 * is given: then every photo and 3D model must be one of that partner's own uploads, so a partner
 * can never show, or later delete, someone else's files.
 */
export async function parseProductInput(
  raw: unknown,
  options: { ownsMedia?: (path: string) => Promise<boolean> } = {}
): Promise<{ ok: true; value: ProductInput } | { ok: false; error: string }> {
  const own = async (path: string | null) => !options.ownsMedia || (path !== null && (await options.ownsMedia(path)));
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request body." };
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 80) return { ok: false, error: "Name must be 3–80 characters." };

  const category = typeof body.category === "string" ? body.category : "";
  if (!category || !(await listCategoryNames()).includes(category)) {
    return { ok: false, error: "Choose a valid category." };
  }

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

  const image = parseImagePath(body.image);
  if (!image) return { ok: false, error: "Upload an image or choose an existing one." };
  if (!(await own(image))) return { ok: false, error: "Upload your own product photo." };

  const rawGallery = Array.isArray(body.gallery) ? body.gallery : [];
  const gallery = rawGallery
    .map(parseImagePath)
    .filter((p): p is string => Boolean(p) && p !== image)
    .filter((p, i, all) => all.indexOf(p) === i);
  if (gallery.length > MAX_GALLERY)
    return { ok: false, error: `Keep the extra photos to ${MAX_GALLERY} or fewer.` };
  for (const g of rawGallery) {
    if (typeof g === "string" && g.trim() && !(await own(parseImagePath(g)))) return { ok: false, error: "Use only photos you uploaded." };
  }

  // Blank means the price is shown as "Ask for price" rather than as free.
  const rawPrice = body.price;
  let pricePesewas: number | null = null;
  if (rawPrice !== null && rawPrice !== undefined && String(rawPrice).trim() !== "") {
    const cleaned = String(rawPrice)
      .replace(/^(GH₵|GHS|₵)/i, "")
      .replace(/[\s,]/g, "")
      .trim();
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned))
      return { ok: false, error: "Enter the price in cedis, for example 45 or 45.50." };
    const price = Number(cleaned);
    if (price > 1_000_000)
      return { ok: false, error: "That price looks too high — enter the amount in cedis." };
    pricePesewas = Math.round(price * 100) || null;
  }

  const stockStatus = typeof body.stockStatus === "string" ? body.stockStatus : DEFAULT_STOCK_STATUS;
  if (!isStockStatus(stockStatus)) return { ok: false, error: "Choose a valid stock status." };

  const imageAlt = typeof body.imageAlt === "string" ? body.imageAlt.trim() : "";
  if (imageAlt.length < 3 || imageAlt.length > 160)
    return { ok: false, error: "Image description must be 3–160 characters." };

  if (!Array.isArray(body.fits)) return { ok: false, error: "Choose at least one phone family." };
  const fits = body.fits.filter((f): f is PhoneGroupId => typeof f === "string" && FIT_SET.has(f));
  if (fits.length < 1) return { ok: false, error: "Choose at least one phone family." };

  const model3dUrl = parseModelUrl(body.model3dUrl);
  if (typeof body.model3dUrl === "string" && body.model3dUrl.trim() && !model3dUrl)
    return { ok: false, error: "The 3D model must be an uploaded file or an https:// link." };
  if (model3dUrl && !(await own(model3dUrl))) return { ok: false, error: "Upload your own 3D model file." };

  const rawColors = Array.isArray(body.colors) ? body.colors : [];
  const colors = rawColors
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.slice(0, 40))
    .slice(0, 10);

  return {
    ok: true,
    value: {
      name,
      category,
      description,
      features,
      image,
      gallery,
      model3dUrl,
      colors,
      pricePesewas,
      stockStatus,
      imageAlt,
      fits,
    },
  };
}

export async function createProduct(
  input: ProductInput,
  owner: { partnerId: string | null; status: ProductStatus } = { partnerId: null, status: "live" }
): Promise<Product> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(input.name);
  const row = await DB.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max FROM products").first<{ max: number }>();
  const sortOrder = (row?.max ?? 0) + 1;

  await DB.prepare(
    `INSERT INTO products (id, slug, name, category, description, features, image, gallery, model_3d_url, colors, price_pesewas, stock_status, image_alt, fits, sort_order, partner_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      slug,
      input.name,
      input.category,
      input.description,
      JSON.stringify(input.features),
      input.image,
      JSON.stringify(input.gallery),
      input.model3dUrl ?? null,
      JSON.stringify(input.colors ?? []),
      input.pricePesewas,
      input.stockStatus,
      input.imageAlt,
      JSON.stringify(input.fits),
      sortOrder,
      owner.partnerId,
      owner.status
    )
    .run();

  const created = await getProductById(id);
  if (!created) throw new Error("Product could not be created.");
  return created;
}

/**
 * Saves edits. `status` (partner edits) also moves the product to live or back to pending review;
 * admin edits leave the status alone.
 */
export async function updateProduct(id: string, input: ProductInput, status?: ProductStatus): Promise<Product | null> {
  const { DB } = await getEnv();
  const existing = await getProductById(id);
  if (!existing) return null;

  await DB.prepare(
    `UPDATE products
     SET name = ?, category = ?, description = ?, features = ?, image = ?, gallery = ?, model_3d_url = ?, colors = ?, price_pesewas = ?, stock_status = ?, image_alt = ?, fits = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.name,
      input.category,
      input.description,
      JSON.stringify(input.features),
      input.image,
      JSON.stringify(input.gallery),
      input.model3dUrl ?? null,
      JSON.stringify(input.colors ?? []),
      input.pricePesewas,
      input.stockStatus,
      input.imageAlt,
      JSON.stringify(input.fits),
      id
    )
    .run();
  if (status) await setProductStatus(id, status, null);
  return getProductById(id);
}

/** Moves a product between live, pending, rejected and hidden, with an optional note for the seller. */
export async function setProductStatus(id: string, status: ProductStatus, note: string | null): Promise<boolean> {
  const { DB } = await getEnv();
  const res = await DB.prepare("UPDATE products SET status = ?, review_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, note, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Turns a stored image path into an R2 object key, when it is one of ours. */
function mediaKey(path: string): string | null {
  if (!path.startsWith(MEDIA_PREFIX)) return null;
  const key = decodeURIComponent(path.slice(MEDIA_PREFIX.length));
  return (key.startsWith("m/") || key.startsWith("products/") || key.startsWith("partners/")) && !key.includes("..") ? key : null;
}

/**
 * Best-effort removal of uploaded files no product uses any more. A file still referenced by any
 * product (as main photo, in a gallery or as a 3D model) is kept. A leftover object must never
 * fail a catalogue write.
 */
async function removeMedia(paths: string[]): Promise<void> {
  const { MEDIA, DB } = await getEnv();
  const candidates = [...new Set(paths)].filter((p) => mediaKey(p));
  const keys: string[] = [];
  for (const path of candidates) {
    const used = await DB.prepare(
      "SELECT 1 AS x FROM products WHERE image = ? OR model_3d_url = ? OR instr(gallery, ?) > 0 LIMIT 1"
    )
      .bind(path, path, JSON.stringify(path))
      .first();
    if (!used) keys.push(mediaKey(path)!);
  }
  if (keys.length === 0) return;
  // The register entry goes with the file.
  for (const key of keys) await DB.prepare("DELETE FROM media_uploads WHERE key = ?").bind(key).run().catch(() => undefined);
  await Promise.all(
    keys.map(async (key) => {
      try {
        await MEDIA.delete(key);
      } catch {
        // Ignore: the catalogue row is the source of truth.
      }
    })
  );
}

/** Deletes the product row and any R2 media uploaded for it. */
export async function deleteProduct(id: string): Promise<boolean> {
  const { DB } = await getEnv();
  const existing = await getProductById(id);
  if (!existing) return false;

  await DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  await removeMedia([existing.image, ...existing.gallery, existing.model3dUrl ?? ""]);

  return true;
}

/** Rejects orphaning uploaded photos when they are replaced or removed during an edit. */
export async function deleteUnusedMedia(previous: string[], next: string[]): Promise<void> {
  const keep = new Set(next);
  await removeMedia(previous.filter((path) => !keep.has(path)));
}
