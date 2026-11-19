import { getEnv } from "./cloudflare";

/**
 * The activity log: who did what in the marketplace. Every partner change and every admin
 * decision about partners is written here; admins read it in the Activity tab.
 */

export type Actor = { id: string; email: string; role: string };

export type ActivityEntry = {
  id: string;
  at: string;
  actorEmail: string | null;
  actorRole: string | null;
  partnerId: string | null;
  action: string;
  entityId: string | null;
  summary: string;
};

/** Records one action. Never throws: a logging problem must not undo the action itself. */
export async function logActivity(entry: {
  actor: Actor | null;
  partnerId?: string | null;
  action: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  try {
    const { DB } = await getEnv();
    await DB.prepare(
      `INSERT INTO activity_log (id, actor_id, actor_email, actor_role, partner_id, action, entity_id, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        entry.actor?.id ?? null,
        entry.actor?.email ?? null,
        entry.actor?.role ?? null,
        entry.partnerId ?? null,
        entry.action,
        entry.entityId ?? null,
        entry.summary.slice(0, 500)
      )
      .run();
  } catch (err) {
    console.error("activity log write failed", entry.action, err);
  }
}

/** Newest first; optionally only entries about one partner. */
export async function listActivity(options: { partnerId?: string; limit?: number } = {}): Promise<ActivityEntry[]> {
  try {
    const { DB } = await getEnv();
    const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
    const where = options.partnerId ? "WHERE partner_id = ?" : "";
    const stmt = DB.prepare(
      `SELECT id, at, actor_email, actor_role, partner_id, action, entity_id, summary FROM activity_log ${where}
       ORDER BY at DESC LIMIT ${limit}`
    );
    const { results } = await (options.partnerId ? stmt.bind(options.partnerId) : stmt).all<{
      id: string;
      at: string;
      actor_email: string | null;
      actor_role: string | null;
      partner_id: string | null;
      action: string;
      entity_id: string | null;
      summary: string;
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
    }));
  } catch (err) {
    console.warn("Could not load activity (run migration 0016?)", err);
    return [];
  }
}
