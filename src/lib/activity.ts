import { getEnv } from "./cloudflare";

/**
 * The activity log: who did what in the marketplace. Every partner change and every admin
 * decision about partners is written here; admins read it in the Activity tab.
 */

export type Actor = { id: string; email: string; role: string };

/** security: sign-ins, 2FA, roles, invitations, resets. admin: staff changes to products, prices,
 * orders and quotes. marketplace: partner actions and decisions about partners. */
export type ActivityCategory = "security" | "admin" | "marketplace";

/** Entries older than this are removed automatically. */
const RETENTION_MONTHS = 12;

function categoryOf(action: string): ActivityCategory {
  if (/^(auth|2fa|reauth|user|invite)\./.test(action)) return "security";
  if (/^(product\.admin_|order\.admin|quote|wholesale|category\.admin)/.test(action)) return "admin";
  return "marketplace";
}

export type ActivityEntry = {
  id: string;
  at: string;
  actorEmail: string | null;
  actorRole: string | null;
  partnerId: string | null;
  action: string;
  entityId: string | null;
  summary: string;
  category: ActivityCategory;
  ip: string | null;
};

/**
 * Records one action. Never throws: a logging problem must not undo the action itself.
 * Pass `request` to record where it came from (IP and browser). Never put passwords, codes or
 * tokens in `summary`.
 */
export async function logActivity(entry: {
  actor: Actor | null;
  /** For actions without a signed-in actor (e.g. a failed sign-in): the email that was tried. */
  actorEmail?: string | null;
  partnerId?: string | null;
  action: string;
  entityId?: string | null;
  summary: string;
  request?: Request;
}): Promise<void> {
  try {
    const { DB } = await getEnv();
    const ip =
      entry.request?.headers.get("cf-connecting-ip") ??
      entry.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const userAgent = entry.request?.headers.get("user-agent")?.slice(0, 200) ?? null;
    const values = [
      crypto.randomUUID(),
      entry.actor?.id ?? null,
      (entry.actor?.email ?? entry.actorEmail ?? null)?.slice(0, 200) ?? null,
      entry.actor?.role ?? null,
      entry.partnerId ?? null,
      entry.action,
      entry.entityId ?? null,
      entry.summary.slice(0, 500),
    ];
    try {
      await DB.prepare(
        `INSERT INTO activity_log (id, actor_id, actor_email, actor_role, partner_id, action, entity_id, summary, category, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(...values, categoryOf(entry.action), ip, userAgent)
        .run();
    } catch {
      // Before migration 0017 (no category/ip columns).
      await DB.prepare(
        `INSERT INTO activity_log (id, actor_id, actor_email, actor_role, partner_id, action, entity_id, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(...values)
        .run();
    }
    // Keep the log to RETENTION_MONTHS: prune on roughly one write in fifty.
    if (Math.random() < 0.02) {
      await DB.prepare(`DELETE FROM activity_log WHERE at < datetime('now', '-${RETENTION_MONTHS} months')`).run();
    }
  } catch (err) {
    console.error("activity log write failed", entry.action, err);
  }
}

/** Newest first; optionally only entries about one partner. */
export async function listActivity(
  options: { partnerId?: string; category?: ActivityCategory; limit?: number } = {}
): Promise<ActivityEntry[]> {
  try {
    const { DB } = await getEnv();
    const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
    const clauses: string[] = [];
    const binds: unknown[] = [];
    if (options.partnerId) {
      clauses.push("partner_id = ?");
      binds.push(options.partnerId);
    }
    if (options.category) {
      clauses.push("category = ?");
      binds.push(options.category);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const stmt = DB.prepare(`SELECT * FROM activity_log ${where} ORDER BY at DESC LIMIT ${limit}`);
    const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<{
      id: string;
      at: string;
      actor_email: string | null;
      actor_role: string | null;
      partner_id: string | null;
      action: string;
      entity_id: string | null;
      summary: string;
      category?: string | null;
      ip?: string | null;
    }>();
    return results.map((r) => ({
      id: r.id,
      at: r.at,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      partnerId: r.partner_id,
      action: r.action,
      entityId: r.entity_id,
      summary: r.summary,
      category: r.category === "security" || r.category === "admin" ? r.category : "marketplace",
      ip: r.ip ?? null,
    }));
  } catch (err) {
    console.warn("Could not load activity (run migration 0016?)", err);
    return [];
  }
}
