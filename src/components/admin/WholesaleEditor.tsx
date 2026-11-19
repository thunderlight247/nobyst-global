"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import type { WholesalePrice } from "@/lib/wholesale";
import { formatPrice } from "@/lib/catalogue";

type Props = {
  products: Product[];
  wholesale: Record<string, WholesalePrice>;
  onChange: (productId: string, value: WholesalePrice | null) => void;
  onNotify: (message: string) => void;
};

type Draft = { price: string; minQty: string };

function toDraft(w: WholesalePrice | undefined): Draft {
  return { price: w ? (w.pricePesewas / 100).toFixed(2) : "", minQty: String(w?.minQuantity ?? 5) };
}

/** One table to set partner wholesale prices for every product. Blank price = not on the list. */
export default function WholesaleEditor({ products, wholesale, onChange, onNotify }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(products.map((p) => [p.id, toDraft(wholesale[p.id])]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const listed = products.filter((p) => wholesale[p.id]).length;

  function dirty(p: Product): boolean {
    const d = drafts[p.id] ?? toDraft(undefined);
    const saved = toDraft(wholesale[p.id]);
    return d.price.trim() !== saved.price || (d.price.trim() !== "" && d.minQty.trim() !== saved.minQty);
  }

  async function save(p: Product) {
    const d = drafts[p.id];
    setSaving(p.id);
    try {
      const res = await fetch("/api/admin/wholesale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, wholesalePrice: d.price.trim(), wholesaleMinQty: d.minQty.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { wholesale?: WholesalePrice | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      const value = data.wholesale ?? null;
      onChange(p.id, value);
      setDrafts((prev) => ({ ...prev, [p.id]: toDraft(value ?? undefined) }));
      onNotify(value ? `Wholesale price saved for ${p.name}.` : `${p.name} removed from the partner price list.`);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Partners</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Wholesale prices</h1>
      <p className="mt-1 max-w-2xl text-xs text-navy/60">
        Only signed-in partners see these, in their portal. Leave a price blank to keep that product off
        the partner price list. {listed} of {products.length} products are listed.
      </p>
      {listed === 0 && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          No wholesale prices yet, so a partner&apos;s price list would be empty. Set some before inviting partners.
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-navy/50">
            <tr>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5 text-right">Retail</th>
              <th className="px-4 py-2.5">Wholesale (GH₵)</th>
              <th className="px-4 py-2.5">Min. units</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {products.map((p) => {
              const d = drafts[p.id] ?? toDraft(undefined);
              const retail = p.pricePesewas;
              const wholesaleNum = Number(d.price);
              const aboveRetail = retail !== null && d.price.trim() !== "" && wholesaleNum * 100 >= retail;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-navy">{p.name}</p>
                    <p className="text-[11px] text-navy/50">{p.category}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-navy/60">{formatPrice(retail) ?? "Not set"}</td>
                  <td className="px-4 py-2.5">
                    <input
                      value={d.price}
                      inputMode="decimal"
                      placeholder="—"
                      aria-label={`Wholesale price for ${p.name}`}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...d, price: e.target.value } }))}
                      className="w-28 rounded-lg border border-navy/20 px-2 py-1.5 text-sm"
                    />
                    {aboveRetail && <p className="mt-0.5 text-[10px] font-bold text-amber-700">Not below retail</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={d.minQty}
                      inputMode="numeric"
                      aria-label={`Minimum units for ${p.name}`}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...d, minQty: e.target.value } }))}
                      className="w-20 rounded-lg border border-navy/20 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={!dirty(p) || saving === p.id}
                      onClick={() => save(p)}
                      className="rounded-lg bg-navy px-3 py-1.5 text-[11px] font-bold text-white hover:bg-royal disabled:bg-navy/20"
                    >
                      {saving === p.id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
