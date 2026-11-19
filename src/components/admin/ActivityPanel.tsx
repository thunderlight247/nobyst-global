"use client";

import { useState } from "react";
import type { ActivityCategory, ActivityEntry } from "@/lib/activity";

const TYPES: { id: "" | ActivityCategory; label: string }[] = [
  { id: "", label: "Everything" },
  { id: "security", label: "Security (sign-ins, 2FA, roles)" },
  { id: "marketplace", label: "Partner shops" },
  { id: "admin", label: "Admin changes" },
];

const ALERT_ACTIONS = new Set(["auth.lockout", "2fa.lockout", "reauth.lockout", "auth.login_failed", "2fa.failed", "reauth.failed", "2fa.reset"]);

type Props = {
  entries: ActivityEntry[];
  partners: { id: string; label: string }[];
  initialPartner?: string;
};

function when(at: string): string {
  const iso = at.includes("T") ? at : at.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Everything partners add, change or remove, and every admin decision about partners. */
export default function ActivityPanel({ entries, partners, initialPartner = "" }: Props) {
  const [partner, setPartner] = useState(initialPartner);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | ActivityCategory>("");
  const q = query.trim().toLowerCase();
  const shown = entries.filter(
    (e) =>
      (!partner || e.partnerId === partner) &&
      (!type || e.category === type) &&
      (!q || e.summary.toLowerCase().includes(q) || (e.ip ?? "").includes(q))
  );
  const recentAlerts = entries.filter(
    (e) => ALERT_ACTIONS.has(e.action) && Date.now() - Date.parse(e.at.includes("T") ? e.at : e.at.replace(" ", "T") + "Z") < 86_400_000
  ).length;

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Marketplace</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Activity &amp; security</h1>
      <p className="mt-1 text-xs text-navy/60">
        Sign-ins and failed attempts, 2FA and role changes, invitations, password resets, admin changes to
        products, prices and orders, and everything partners do. Newest first; kept for 12 months. Passwords
        and codes are never recorded.
      </p>
      {recentAlerts > 0 && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {recentAlerts} failed sign-in, wrong code or lockout event{recentAlerts === 1 ? "" : "s"} in the last 24 hours.{" "}
          <button type="button" onClick={() => setType("security")} className="font-bold underline">
            Show security events
          </button>
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as "" | ActivityCategory)} className="min-h-[40px] rounded-lg border border-navy/20 bg-white px-3 text-sm">
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={partner} onChange={(e) => setPartner(e.target.value)} className="min-h-[40px] rounded-lg border border-navy/20 bg-white px-3 text-sm">
          <option value="">All partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activity"
          className="min-h-[40px] flex-1 rounded-lg border border-navy/20 px-3 text-sm"
        />
      </div>
      {shown.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-navy/10 bg-white p-10 text-center text-xs text-navy/50">No activity yet.</p>
      ) : (
        <ol className="mt-5 divide-y divide-navy/5 rounded-2xl border border-navy/10 bg-white">
          {shown.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span className={`min-w-0 ${ALERT_ACTIONS.has(e.action) ? "text-rose-700" : "text-navy"}`}>
                {e.summary}
                {e.actorRole && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${e.actorRole === "partner" ? "bg-amber-100 text-amber-800" : "bg-navy/10 text-navy"}`}>
                    {e.actorRole === "partner" ? "Partner" : e.actorRole === "customer" ? "Customer" : "Staff"}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right text-[11px] text-navy/45">
                <time>{when(e.at)}</time>
                {e.ip && <span className="block font-mono">{e.ip}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
