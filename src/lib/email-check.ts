/**
 * Catches mistyped email addresses before we send something that can never arrive, e.g. an
 * invitation to "name@gmail.coom".
 */

const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "ymail.com",
];

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        // Swapped neighbours ("gmial") count as one slip.
        i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? dp[i - 2][j - 2] + 1 : Infinity
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Suggests a correction when the domain is one or two typing slips away from a common provider,
 * e.g. "a@gmail.coom" → "a@gmail.com". Returns null when it looks fine or is not close to one.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    const d = editDistance(domain, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ? `${local}@${best}` : null;
}

/**
 * Asks DNS (Cloudflare's public resolver) whether the address's domain can receive mail: it must
 * exist and have an MX record, or at least an address record. Only the domain is sent.
 * Returns true when the lookup itself fails, so a DNS outage never blocks sending.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  const lookup = async (type: "MX" | "A") => {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    if (!res.ok) throw new Error(`DNS lookup failed: ${res.status}`);
    return (await res.json()) as { Status: number; Answer?: { type: number }[] };
  };
  try {
    const mx = await lookup("MX");
    if (mx.Status === 3) return false; // NXDOMAIN: the domain does not exist
    if (mx.Answer?.some((a) => a.type === 15)) return true;
    const a = await lookup("A");
    return Boolean(a.Answer?.some((r) => r.type === 1));
  } catch (err) {
    console.error("email domain check failed; sending anyway", err);
    return true;
  }
}
