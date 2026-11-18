import { getEnv } from "./cloudflare";

/**
 * Wholesale prices for partners. They are stored apart from `products` and read only by the
 * partner portal and the admin, so no public page or public API can ever include them.
 */
export type WholesalePrice = { pricePesewas: number; minQuantity: number };

export type PartnerCatalogueItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  image: string;
  imageAlt: string;
  stockStatus: string;
  retailPesewas: number | null;
  wholesalePesewas: number;
  minQuantity: number;
};

export const DEFAULT_MIN_QUANTITY = 5;

/** productId → wholesale price, for the admin product form. Empty if the table is missing. */
export async function listWholesalePrices(): Promise<Record<string, WholesalePrice>> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      "SELECT product_id, price_pesewas, min_quantity FROM wholesale_prices"
    ).all<{ product_id: string; price_pesewas: number; min_quantity: number }>();
    return Object.fromEntries(
      results.map((r) => [r.product_id, { pricePesewas: r.price_pesewas, minQuantity: r.min_quantity }])
    );
  } catch (err) {
    console.warn("Could not load wholesale prices (run migration 0009?)", err);
    return {};
  }
}

/** Products that have a wholesale price, for the partner portal. */
export async function listPartnerCatalogue(): Promise<PartnerCatalogueItem[]> {
  try {
    const { DB } = await getEnv();
    const { results } = await DB.prepare(
      `SELECT p.id, p.slug, p.name, p.category, p.image, p.image_alt, p.stock_status, p.price_pesewas,
              w.price_pesewas AS wholesale_pesewas, w.min_quantity
       FROM wholesale_prices w JOIN products p ON p.id = w.product_id
       ORDER BY p.category ASC, p.sort_order ASC, p.name ASC`
    ).all<{
      id: string;
      slug: string;
      name: string;
      category: string;
      image: string;
      image_alt: string;
      stock_status: string;
      price_pesewas: number | null;
      wholesale_pesewas: number;
      min_quantity: number;
    }>();
    return results.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      image: r.image,
      imageAlt: r.image_alt,
      stockStatus: r.stock_status,
      retailPesewas: r.price_pesewas,
      wholesalePesewas: r.wholesale_pesewas,
      minQuantity: r.min_quantity,
    }));
  } catch (err) {
    console.warn("Could not load partner catalogue (run migration 0009?)", err);
    return [];
  }
}

/** Validates the wholesale fields of the admin product form. Blank price means "no wholesale". */
export function parseWholesaleInput(
  raw: unknown
): { ok: true; value: WholesalePrice | null } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const rawPrice = body.wholesalePrice;
  if (rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === "") {
    return { ok: true, value: null };
  }
  const cleaned = String(rawPrice).replace(/^(GH₵|GHS|₵)/i, "").replace(/[\s,]/g, "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0 || Number(cleaned) > 1_000_000) {
    return { ok: false, error: "Enter the wholesale price in cedis, for example 30 or 30.50." };
  }
  const minQuantity = body.wholesaleMinQty === undefined || body.wholesaleMinQty === "" ? DEFAULT_MIN_QUANTITY : Number(body.wholesaleMinQty);
  if (!Number.isInteger(minQuantity) || minQuantity < 1 || minQuantity > 100_000) {
    return { ok: false, error: "Minimum wholesale quantity must be a whole number from 1." };
  }
  return { ok: true, value: { pricePesewas: Math.round(Number(cleaned) * 100), minQuantity } };
}

export async function saveWholesalePrice(productId: string, value: WholesalePrice | null): Promise<void> {
  const { DB } = await getEnv();
  if (!value) {
    await DB.prepare("DELETE FROM wholesale_prices WHERE product_id = ?").bind(productId).run();
    return;
  }
  await DB.prepare(
    `INSERT INTO wholesale_prices (product_id, price_pesewas, min_quantity) VALUES (?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET price_pesewas = excluded.price_pesewas,
       min_quantity = excluded.min_quantity, updated_at = datetime('now')`
  )
    .bind(productId, value.pricePesewas, value.minQuantity)
    .run();
}
