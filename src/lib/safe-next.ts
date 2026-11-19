/** A same-site path to open after signing in, or null. Rejects "//host" and "/\host". */
export function safeNext(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next.length <= 500 ? next : null;
}
