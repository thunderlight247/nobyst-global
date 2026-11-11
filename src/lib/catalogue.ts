// Client-safe catalogue helpers. No bindings, no server-only imports, so client
// components can use these without pulling in the Cloudflare runtime.

export const stockStatuses = [
  { id: "in_stock", label: "In stock" },
  { id: "low_stock", label: "Low stock" },
  { id: "out_of_stock", label: "Out of stock" },
] as const;

export type StockStatus = (typeof stockStatuses)[number]["id"];

export const DEFAULT_STOCK_STATUS: StockStatus = "in_stock";

export function isStockStatus(value: string): value is StockStatus {
  return stockStatuses.some((s) => s.id === value);
}

export function stockLabel(status: StockStatus): string {
  return stockStatuses.find((s) => s.id === status)?.label ?? stockStatuses[0].label;
}

/**
 * Prices are stored in pesewas so they never pick up floating-point drift.
 * Returns null when no price is set, which the pages show as "Ask for price".
 */
export function formatPrice(pesewas: number | null): string | null {
  if (pesewas === null || !Number.isFinite(pesewas) || pesewas <= 0) return null;
  const [whole, cents] = (pesewas / 100).toFixed(2).split(".");
  return `GH₵${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}
