"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { Role, UserSummary } from "@/lib/auth";

type Props = {
  initialUsers: UserSummary[];
  currentUserId: string;
  onNotify: (message: string) => void;
};

const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  partner: "Partner",
  admin: "Admin",
};

const ROLE_STYLES: Record<Role, string> = {
  customer: "bg-slate-100 text-slate-700",
  partner: "bg-amber-100 text-amber-800",
  admin: "bg-navy text-white",
};

/** Admin-only list of accounts where roles and partner company names are granted or removed. */
export default function UserManager({ initialUsers, currentUserId, onNotify }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<Role>("customer");
  const [draftCompany, setDraftCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.company ?? "").toLowerCase().includes(q)
  );

  function startEdit(user: UserSummary) {
    setEditing(user.id);
    setDraftRole(user.role);
    setDraftCompany(user.company ?? "");
    setError(null);
  }

  async function save(user: UserSummary) {
    if (draftRole === "admin" && user.role !== "admin") {
      const ok = window.confirm(
        `Give ${user.email} full admin access? They will be able to change products, prices, orders and other accounts.`
      );
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: draftRole, company: draftCompany }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: UserSummary; error?: string };
      if (!res.ok || !data.user) throw new Error(data.error ?? "Could not update the account.");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user! : u)));
      setEditing(null);
      onNotify(`${data.user.email} is now ${ROLE_LABELS[data.user.role].toLowerCase()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Access</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Users &amp; roles</h1>
      <p className="mt-1 max-w-2xl text-xs text-navy/60">
        Everyone signs up as a customer. Make an account a <strong>partner</strong> to open the partner
        portal (wholesale prices and their own bulk requests), or an <strong>admin</strong> for this
        dashboard. Changing a role signs that account out so the change applies straight away.
      </p>

      <div className="relative mt-6 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name or company"
          className="min-h-[44px] w-full rounded-xl border border-navy/15 bg-white py-2.5 pl-10 pr-3 text-sm text-navy focus:border-royal focus:outline-none"
        />
      </div>

      <ul className="mt-5 space-y-3">
        {shown.length === 0 && (
          <li className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-xs text-navy/50">
            No accounts match.
          </li>
        )}
        {shown.map((u) => {
          const isSelf = u.id === currentUserId;
          const isEditing = editing === u.id;
          return (
            <li key={u.id} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">
                    {u.name} {isSelf && <span className="text-xs font-normal text-navy/50">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-navy/60">{u.email}</p>
                  {u.company && <p className="truncate text-xs text-amber-800">{u.company}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_STYLES[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(u)}
                      className="min-h-[36px] rounded-lg bg-navy/5 px-3 text-[11px] font-bold text-navy hover:bg-navy hover:text-white"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 grid gap-3 border-t border-navy/5 pt-4 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                  <label className="text-xs font-bold text-navy">
                    Role
                    <select
                      value={draftRole}
                      disabled={isSelf}
                      onChange={(e) => setDraftRole(e.target.value as Role)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-navy/20 bg-white px-2 text-sm disabled:opacity-60"
                    >
                      <option value="customer">Customer</option>
                      <option value="partner">Partner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-navy">
                    Company {draftRole === "partner" && <span className="text-rose-600">*</span>}
                    <input
                      value={draftCompany}
                      onChange={(e) => setDraftCompany(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Kintampo Phone Traders"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-navy/20 px-3 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => save(u)}
                      className="min-h-[40px] rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="min-h-[40px] rounded-lg border border-navy/20 px-4 text-xs font-bold text-navy"
                    >
                      Cancel
                    </button>
                  </div>
                  {isSelf && (
                    <p className="text-[11px] text-navy/55 sm:col-span-3">
                      You cannot change your own role. Another admin can.
                    </p>
                  )}
                  {error && <p className="text-xs font-bold text-rose-600 sm:col-span-3">{error}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
