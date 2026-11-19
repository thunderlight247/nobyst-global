"use client";

import { useState } from "react";
import type { ActivityEntry } from "@/lib/activity";

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
  const q = query.trim().toLowerCase();
  const shown = entries.filter((e) => (!partner || e.partnerId === partner) && (!q || e.summary.toLowerCase().includes(q)));

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Marketplace</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Activity</h1>
      <p className="mt-1 text-xs text-navy/60">What partners add, edit, hide or delete, and every admin decision about partners. Newest first.</p>
      <div className="mt-5 flex flex-wrap gap-2">
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
              <span className="min-w-0 text-navy">
                {e.summary}
                {e.actorRole && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${e.actorRole === "partner" ? "bg-amber-100 text-amber-800" : "bg-navy/10 text-navy"}`}>
                    {e.actorRole === "partner" ? "Partner" : "Admin"}
                  </span>
                )}
              </span>
              <time className="shrink-0 text-[11px] text-navy/45">{when(e.at)}</time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
