/**
 * Account roles and the rules between them. Pure functions with no server imports, so the admin
 * UI and the API enforce exactly the same rules (the API is what actually decides).
 *
 *   customer < partner < admin < owner
 *
 * Owners can do everything admins can. Only an owner can create, change or remove an admin or
 * owner; admins can only move accounts between customer and partner.
 */

export type Role = "customer" | "partner" | "admin" | "owner";
export const ROLES: Role[] = ["customer", "partner", "admin", "owner"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/** Admins and owners: can open /admin and call /api/admin. */
export function isStaff(role: Role | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

export type Area = "admin" | "partner" | "customer";

/** Whether a role may sign in through a given area's sign-in page. */
export function canEnterArea(role: Role, area: Area): boolean {
  if (area === "admin") return isStaff(role);
  // Staff may sign in to the partner portal to preview it.
  if (area === "partner") return role === "partner" || isStaff(role);
  return true;
}

/** Where each role lands after signing in, when no specific page was requested. */
export function homeFor(role: Role): string {
  if (isStaff(role)) return "/admin";
  if (role === "partner") return "/partner";
  return "/account";
}

/**
 * Checks a role change requested in the admin. Returns an error message, or null when allowed.
 * `ownerCount` is the number of owners before the change.
 */
export function roleChangeError(input: {
  actor: { id: string; role: Role };
  target: { id: string; role: Role };
  next: Role;
  ownerCount: number;
}): string | null {
  const { actor, target, next, ownerCount } = input;
  if (!isStaff(actor.role)) return "Not allowed.";
  if (target.id === actor.id && next !== target.role) {
    return "You cannot change your own role. Ask an owner.";
  }
  const touchesStaff = isStaff(target.role) || isStaff(next);
  if (touchesStaff && actor.role !== "owner") {
    return "Only an owner can give or remove admin or owner access.";
  }
  if (target.role === "owner" && next !== "owner" && ownerCount <= 1) {
    return "This is the only owner. Make someone else an owner first.";
  }
  return null;
}

/** A partner's standing: pending partners wait for approval, suspended ones have no access. */
export type PartnerStatus = "pending" | "trusted" | "suspended";
export const PARTNER_STATUSES: PartnerStatus[] = ["pending", "trusted", "suspended"];
export function isPartnerStatus(value: unknown): value is PartnerStatus {
  return typeof value === "string" && (PARTNER_STATUSES as string[]).includes(value);
}
export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  pending: "Pending review",
  trusted: "Trusted",
  suspended: "Suspended",
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  partner: "Partner",
  admin: "Admin",
  owner: "Owner",
};
