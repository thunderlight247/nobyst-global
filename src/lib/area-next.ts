/**
 * The page to open after signing in to an area. Only paths inside that area are accepted, so the
 * sign-in pages cannot be used to send someone to another page or site.
 */
export function areaNext(area: "admin" | "partner", next: string | undefined): string {
  const home = `/${area}`;
  if (!next || next.startsWith("//") || next.startsWith("/\\")) return home;
  if (next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`)) {
    // Never bounce back to the sign-in page itself.
    return next.startsWith(`${home}/login`) ? home : next;
  }
  return home;
}
