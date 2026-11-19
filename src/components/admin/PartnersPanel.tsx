"use client";

import { useState } from "react";
import type { PartnerSummary } from "@/lib/partner-orders";
import { formatPrice } from "@/lib/catalogue";
import { PARTNER_STATUS_LABELS, isPartnerStatus } from "@/lib/roles";
import { adminFetch } from "@/components/admin/reauth";

type Props = {
  initialPartners: PartnerSummary[];
  onShowActivity: (partnerId: string) => void;
  onNotify: (message: string) => void;
};

const money = (p: number) => formatPrice(p) ?? "GH₵0.00";

/** Partner shops: products, sales, commission, what NOBYST owes and payouts. */
export default function PartnersPanel({ initialPartners, onShowActivity, onNotify }: Props) {
  const [partners, setPartners] = useState(initialPartners);
  const [open, setOpen] = useState<string | null>(null);
  const [commission, setCommission] = useState("");
  const [payout, setPayout] = useState({ amount: "", method: "MTN MoMo", reference: "", note: "" });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/partners");
    if (res.ok) setPartners(((await res.json()) as { partners: PartnerSummary[] }).partners);
  }

  async function act(url: string, method: string, body: unknown, success: string) {
    setBusy(true);
    try {
      const res = await adminFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      onNotify(success);
      await refresh();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Marketplace</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Partner shops</h1>
      <p className="mt-1 text-xs text-navy/60">
        Customers pay NOBYST; each partner is owed their sales minus commission once an order is delivered. Pay them
        by mobile money or bank, then record the payout here.
      </p>
      {partners.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-navy/10 bg-white p-10 text-center text-xs text-navy/50">No partners yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {partners.map((p) => (
            <li key={p.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-navy">{p.company ?? p.email}</p>
                  <p className="text-xs text-navy/55">
                    {p.email} · {isPartnerStatus(p.partnerStatus) ? PARTNER_STATUS_LABELS[p.partnerStatus] : "Partner"} ·{" "}
                    {p.products.live} live, {p.products.pending} waiting, {p.products.total} total · commission {p.commissionBps / 100}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase text-navy/50">Owed now</p>
                  <p className={`font-display text-xl font-extrabold ${p.earnings.owedPesewas > 0 ? "text-royal" : "text-navy"}`}>{money(p.earnings.owedPesewas)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-navy/60">
                Sales {money(p.earnings.grossPesewas)} · commission {money(p.earnings.commissionPesewas)} · not yet delivered{" "}
                {money(p.earnings.pendingPesewas)} · paid out {money(p.earnings.paidOutPesewas)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(open === p.id ? null : p.id);
                    setCommission(String(p.commissionBps / 100));
                    setPayout({ amount: p.earnings.owedPesewas > 0 ? (p.earnings.owedPesewas / 100).toFixed(2) : "", method: "MTN MoMo", reference: "", note: "" });
                  }}
                  className="min-h-[36px] rounded-lg bg-navy/5 px-3 text-xs font-bold text-navy hover:bg-navy hover:text-white"
                >
                  {open === p.id ? "Close" : "Commission & payouts"}
                </button>
                <button type="button" onClick={() => onShowActivity(p.id)} className="min-h-[36px] rounded-lg px-3 text-xs font-bold text-royal hover:bg-royal/5">
                  View activity
                </button>
              </div>
              {open === p.id && (
                <div className="mt-4 grid gap-4 border-t border-navy/5 pt-4 lg:grid-cols-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(`/api/admin/partners/${p.id}`, "PATCH", { commissionPercent: Number(commission) }, "Commission updated for future sales.");
                    }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-bold text-navy">
                      NOBYST commission (%)
                      <input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" className="mt-1 min-h-[40px] w-32 rounded-lg border border-navy/20 px-3 text-sm" />
                    </label>
                    <p className="text-[11px] text-navy/55">Applies to new sales; past sales keep the rate they were made at.</p>
                    <button type="submit" disabled={busy} className="min-h-[38px] rounded-lg bg-navy px-3 text-xs font-bold text-white hover:bg-royal disabled:opacity-60">
                      Save commission
                    </button>
                  </form>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(`/api/admin/partners/${p.id}/payouts`, "POST", payout, "Payout recorded and the partner emailed.");
                    }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-bold text-navy">Record a payout</p>
                    <p className="text-[11px] text-navy/60">
                      <strong>Pay to:</strong> {p.payoutDetails ?? "The partner has not added payout details yet."}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} placeholder="Amount (GH₵)" inputMode="decimal" className="min-h-[40px] rounded-lg border border-navy/20 px-3 text-sm" />
                      <input value={payout.method} onChange={(e) => setPayout({ ...payout, method: e.target.value })} placeholder="Method" className="min-h-[40px] rounded-lg border border-navy/20 px-3 text-sm" />
                      <input value={payout.reference} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} placeholder="Transaction ref" className="min-h-[40px] rounded-lg border border-navy/20 px-3 text-sm" />
                      <input value={payout.note} onChange={(e) => setPayout({ ...payout, note: e.target.value })} placeholder="Note (optional)" className="min-h-[40px] rounded-lg border border-navy/20 px-3 text-sm" />
                    </div>
                    <button type="submit" disabled={busy || !payout.amount} className="min-h-[38px] rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                      Record payout
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
