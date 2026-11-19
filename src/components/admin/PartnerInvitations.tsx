"use client";

import { useState } from "react";
import { Mail, Send, X } from "lucide-react";
import type { Invitation, InvitationStatus } from "@/lib/invitations";
import { suggestEmail } from "@/lib/email-check";

export type InviteDraft = { email: string; name: string; company: string; enquiryId: string | null };

const STATUS_STYLES: Record<InvitationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-rose-100 text-rose-700",
};

const field =
  "mt-1 min-h-[42px] w-full rounded-lg border border-navy/20 bg-white px-3 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

/** Modal that emails a single-use partner portal invitation. */
export function InviteDialog({
  draft,
  warning,
  onClose,
  onSent,
}: {
  draft: InviteDraft;
  warning?: string;
  onClose: () => void;
  onSent: (invitation: Invitation, devLink?: string) => void;
}) {
  const [email, setEmail] = useState(draft.email);
  const [name, setName] = useState(draft.name);
  const [company, setCompany] = useState(draft.company);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company, enquiryId: draft.enquiryId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        invitation?: Invitation;
        devLink?: string;
        error?: string;
      };
      if (!res.ok || !data.invitation) throw new Error(data.error ?? "Could not send the invitation.");
      onSent(data.invitation, data.devLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invitation.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <form onSubmit={send} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-navy">Invite a partner</h2>
            <p className="mt-1 text-xs text-navy/60">
              We email a single-use link (valid 7 days). Opening it lets them create their sign-in and
              go straight to their partner portal. Sending again replaces any earlier link.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-navy/50 hover:bg-navy/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {warning && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">{warning}</p>
        )}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-navy">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          {suggestEmail(email) && (
            <p className="-mt-1 text-xs text-amber-800">
              Did you mean <strong>{suggestEmail(email)}</strong>?{" "}
              <button type="button" onClick={() => setEmail(suggestEmail(email)!)} className="font-bold underline">
                Use it
              </button>
            </p>
          )}
          <label className="block text-xs font-bold text-navy">
            Contact name
            <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="block text-xs font-bold text-navy">
            Company
            <input required minLength={2} maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} className={field} />
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[42px] rounded-lg border border-navy/20 px-4 text-xs font-bold text-navy">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60"
          >
            <Send size={14} />
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Invitations list for the Users tab: status, resend and revoke. */
export default function PartnerInvitations({
  invitations,
  onInvite,
  onRevoked,
  onNotify,
}: {
  invitations: Invitation[];
  onInvite: (draft: InviteDraft) => void;
  onRevoked: (id: string) => void;
  onNotify: (message: string) => void;
}) {
  async function revoke(inv: Invitation) {
    if (!window.confirm(`Cancel the invitation for ${inv.email}? The link will stop working.`)) return;
    const res = await fetch(`/api/admin/invitations/${inv.id}`, { method: "DELETE" });
    if (res.ok) {
      onRevoked(inv.id);
      onNotify(`Invitation for ${inv.email} cancelled.`);
    } else {
      onNotify("Could not cancel that invitation.");
    }
  }

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Partners</span>
          <h2 className="font-display text-xl font-extrabold text-navy sm:text-2xl">Partner invitations</h2>
          <p className="mt-1 max-w-2xl text-xs text-navy/60">
            Invite approved applicants by email. You can also invite straight from a partnership enquiry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onInvite({ email: "", name: "", company: "", enquiryId: null })}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-4 text-xs font-bold text-white hover:bg-royal"
        >
          <Mail size={15} />
          Invite a partner
        </button>
      </div>

      {invitations.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-navy/10 bg-white p-6 text-center text-xs text-navy/50">
          No invitations sent yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-navy/5 rounded-2xl border border-navy/10 bg-white">
          {invitations.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy">{inv.company}</p>
                <p className="truncate text-xs text-navy/60">
                  {inv.name} · {inv.email}
                </p>
                <p className="text-[11px] text-navy/40">
                  Sent {new Date(inv.createdAt.replace(" ", "T") + "Z").toLocaleDateString()}
                  {inv.status === "pending" && ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[inv.status]}`}>
                  {inv.status}
                </span>
                {inv.status !== "accepted" && (
                  <button
                    type="button"
                    onClick={() =>
                      onInvite({ email: inv.email, name: inv.name, company: inv.company, enquiryId: inv.enquiryId })
                    }
                    className="min-h-[34px] rounded-lg bg-navy/5 px-3 text-[11px] font-bold text-navy hover:bg-navy hover:text-white"
                  >
                    {inv.status === "pending" ? "Resend" : "Invite again"}
                  </button>
                )}
                {inv.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => revoke(inv)}
                    className="min-h-[34px] rounded-lg px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
