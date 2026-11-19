"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Product } from "@/lib/products";
import type { CategoryRequest } from "@/lib/marketplace";
import { formatPrice } from "@/lib/catalogue";

type Props = {
  products: Product[];
  requests: CategoryRequest[];
  onProductReviewed: (product: Product) => void;
  onRequestDecided: (request: CategoryRequest) => void;
  onNotify: (message: string) => void;
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** Partner products waiting for review, and partners' requests for new categories. */
export default function ApprovalsPanel({ products, requests, onProductReviewed, onRequestDecided, onNotify }: Props) {
  const pending = products.filter((p) => p.status === "pending");
  const openRequests = requests.filter((r) => r.status === "pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function review(product: Product, status: "live" | "rejected") {
    const note = (notes[product.id] ?? "").trim();
    if (status === "rejected" && !note) return onNotify("Write a short note telling the seller what to change.");
    setBusy(product.id);
    try {
      const r = (await post(`/api/admin/products/${product.id}/review`, { status, note })) as { product: Product };
      onProductReviewed(r.product);
      onNotify(status === "live" ? `${product.name} is live.` : `${product.name} was sent back to ${product.partnerName}.`);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(request: CategoryRequest, decision: "approve" | "decline") {
    setBusy(request.id);
    try {
      const r = (await post(`/api/admin/category-requests/${request.id}`, { decision, note: notes[request.id] ?? "" })) as { request: CategoryRequest };
      onRequestDecided(r.request);
      onNotify(decision === "approve" ? `Category “${request.name}” added.` : `Request for “${request.name}” declined.`);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Marketplace</span>
        <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Approvals</h1>
        <p className="mt-1 text-xs text-navy/60">
          Products from partners who are not trusted yet wait here before they appear in the shop. Mark a partner
          trusted (Users &amp; Partners) to let their changes go live straight away.
        </p>
        {pending.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-navy/10 bg-white p-10 text-center text-xs text-navy/50">Nothing waiting for review.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {pending.map((p) => (
              <li key={p.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <Image src={p.image} alt={p.imageAlt} fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold text-navy">{p.name}</p>
                    <p className="text-xs text-navy/55">
                      {p.partnerName} · {p.category} · {formatPrice(p.pricePesewas) ?? "No price"} · {p.gallery.length + 1} photo
                      {p.gallery.length ? "s" : ""}
                    </p>
                    <p className="mt-2 text-navy/75">{p.description}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-navy/65">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[p.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="Note to the seller (required to reject)"
                    maxLength={500}
                    className="min-h-[40px] flex-1 rounded-lg border border-navy/20 px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => review(p, "live")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => review(p, "rejected")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-300 px-4 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <XCircle size={15} /> Send back
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold text-navy">Category requests</h2>
        {openRequests.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-navy/10 bg-white p-6 text-center text-xs text-navy/50">No open requests.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {openRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold text-navy">{r.name}</p>
                  <p className="text-xs text-navy/55">
                    Asked by {r.partnerName}
                    {r.note ? `: ${r.note}` : ""}
                  </p>
                </div>
                <input
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Note (optional)"
                  maxLength={300}
                  className="min-h-[38px] rounded-lg border border-navy/20 px-3 text-sm"
                />
                <button type="button" disabled={busy === r.id} onClick={() => decide(r, "approve")} className="min-h-[38px] rounded-lg bg-navy px-3 text-xs font-bold text-white hover:bg-royal">
                  Add category
                </button>
                <button type="button" disabled={busy === r.id} onClick={() => decide(r, "decline")} className="min-h-[38px] rounded-lg px-3 text-xs font-bold text-rose-700 hover:bg-rose-50">
                  Decline
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
