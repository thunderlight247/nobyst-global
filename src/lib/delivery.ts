/**
 * Delivery details collected at checkout. Shared by the checkout form (client) and the
 * checkout API (server), so both validate against the same rules.
 */

export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

export type DeliveryMethod = "delivery" | "pickup" | "arranged";

export const DELIVERY_METHODS: { id: Exclude<DeliveryMethod, "arranged">; label: string; hint: string }[] = [
  { id: "delivery", label: "Deliver to me", hint: "We call to confirm the delivery cost and time before dispatch." },
  { id: "pickup", label: "Pick up in Techiman", hint: "We call when your order is ready to collect." },
];

export type DeliveryDetails = {
  method: DeliveryMethod;
  region: string | null;
  town: string | null;
  address: string | null;
  notes: string | null;
};

/** Order progress after payment, in the order the team moves through it. */
export const FULFILMENT_STATUSES = [
  { id: "new", label: "New", customerLabel: "Order received" },
  { id: "processing", label: "Processing", customerLabel: "Being prepared" },
  { id: "dispatched", label: "Dispatched", customerLabel: "On its way" },
  { id: "ready", label: "Ready for pickup", customerLabel: "Ready to collect" },
  { id: "delivered", label: "Delivered / collected", customerLabel: "Completed" },
  { id: "cancelled", label: "Cancelled", customerLabel: "Cancelled" },
] as const;

export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number]["id"];

export function isFulfilmentStatus(value: unknown): value is FulfilmentStatus {
  return typeof value === "string" && FULFILMENT_STATUSES.some((s) => s.id === value);
}

export function fulfilmentLabel(status: string, audience: "admin" | "customer" = "customer"): string {
  const s = FULFILMENT_STATUSES.find((x) => x.id === status);
  if (!s) return status;
  return audience === "admin" ? s.label : s.customerLabel;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, max);
  return s || null;
}

/** Validates the delivery part of a checkout request. Returns an error message or the details. */
export function parseDelivery(raw: unknown): DeliveryDetails | string {
  const b = (raw ?? {}) as Record<string, unknown>;
  const method = b.method === "pickup" ? "pickup" : b.method === "delivery" ? "delivery" : null;
  if (!method) return "Choose delivery or pickup.";
  const notes = clean(b.notes, 500);
  if (method === "pickup") return { method, region: null, town: null, address: null, notes };

  const region = clean(b.region, 40);
  if (!region || !(GHANA_REGIONS as readonly string[]).includes(region)) return "Choose your region.";
  const town = clean(b.town, 80);
  if (!town || town.length < 2) return "Enter your town or city.";
  const address = clean(b.address, 300);
  if (!address || address.length < 5) {
    return "Enter a delivery address or landmark (a GhanaPost GPS code helps).";
  }
  return { method, region, town, address, notes };
}

/** One-line summary for emails and the admin. */
export function describeDelivery(d: {
  method: string | null;
  region?: string | null;
  town?: string | null;
  address?: string | null;
}): string {
  if (d.method === "pickup") return "Pickup in Techiman";
  if (d.method === "arranged") return "Arranged with the partner";
  if (d.method === "delivery") return [d.address, d.town, d.region].filter(Boolean).join(", ");
  return "Not given";
}
