import { describe, expect, it } from "vitest";
import { canEnterArea, homeFor, roleChangeError, type Role } from "@/lib/roles";
import { areaNext } from "@/lib/area-next";

const actor = (role: Role) => ({ id: "actor", role });
const target = (role: Role) => ({ id: "target", role });

describe("role change rules", () => {
  it("lets admins move accounts between customer and partner only", () => {
    expect(roleChangeError({ actor: actor("admin"), target: target("customer"), next: "partner", ownerCount: 1 })).toBeNull();
    expect(roleChangeError({ actor: actor("admin"), target: target("partner"), next: "customer", ownerCount: 1 })).toBeNull();
    expect(roleChangeError({ actor: actor("admin"), target: target("customer"), next: "admin", ownerCount: 1 })).toMatch(/owner/);
    expect(roleChangeError({ actor: actor("admin"), target: target("admin"), next: "customer", ownerCount: 1 })).toMatch(/owner/);
    expect(roleChangeError({ actor: actor("admin"), target: target("customer"), next: "owner", ownerCount: 1 })).toMatch(/owner/);
  });

  it("lets owners manage admins and other owners", () => {
    expect(roleChangeError({ actor: actor("owner"), target: target("customer"), next: "admin", ownerCount: 1 })).toBeNull();
    expect(roleChangeError({ actor: actor("owner"), target: target("admin"), next: "owner", ownerCount: 1 })).toBeNull();
    expect(roleChangeError({ actor: actor("owner"), target: target("owner"), next: "admin", ownerCount: 2 })).toBeNull();
  });

  it("protects the last owner and stops anyone changing their own role", () => {
    expect(roleChangeError({ actor: actor("owner"), target: target("owner"), next: "admin", ownerCount: 1 })).toMatch(/only owner/);
    expect(roleChangeError({ actor: actor("owner"), target: { id: "actor", role: "owner" }, next: "admin", ownerCount: 3 })).toMatch(/own role/);
  });

  it("never lets non-staff change roles", () => {
    for (const role of ["customer", "partner"] as Role[]) {
      expect(roleChangeError({ actor: actor(role), target: target("customer"), next: "partner", ownerCount: 1 })).toBe("Not allowed.");
    }
  });
});

describe("sign-in areas", () => {
  it("admits only the right roles to each area", () => {
    expect(canEnterArea("customer", "admin")).toBe(false);
    expect(canEnterArea("partner", "admin")).toBe(false);
    expect(canEnterArea("admin", "admin")).toBe(true);
    expect(canEnterArea("owner", "admin")).toBe(true);
    expect(canEnterArea("customer", "partner")).toBe(false);
    expect(canEnterArea("partner", "partner")).toBe(true);
    expect(canEnterArea("owner", "partner")).toBe(true);
    expect(canEnterArea("customer", "customer")).toBe(true);
  });

  it("sends each role to its home", () => {
    expect([homeFor("customer"), homeFor("partner"), homeFor("admin"), homeFor("owner")]).toEqual([
      "/account",
      "/partner",
      "/admin",
      "/admin",
    ]);
  });

  it("only follows next links inside the area", () => {
    expect(areaNext("admin", "/admin/orders")).toBe("/admin/orders");
    expect(areaNext("admin", undefined)).toBe("/admin");
    expect(areaNext("admin", "/account")).toBe("/admin");
    expect(areaNext("admin", "/administrator")).toBe("/admin");
    expect(areaNext("admin", "//evil.example/admin")).toBe("/admin");
    expect(areaNext("admin", "/\\evil.example")).toBe("/admin");
    expect(areaNext("admin", "/admin/login")).toBe("/admin");
    expect(areaNext("partner", "/partner?tab=quotes")).toBe("/partner?tab=quotes");
  });
});
