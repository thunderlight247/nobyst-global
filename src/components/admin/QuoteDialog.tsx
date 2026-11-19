"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import type { Enquiry } from "@/lib/enquiries";
import type { OrderSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/catalogue";
import { adminFetch } from "@/components/admin/reauth";

const field =
  "mt-1 min-h-[42px] w-full rounded-lg border border-navy/20 bg-white px-3 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

/** Prices a partner's bulk request and emails them a Paystack payment link. */
export default function QuoteDialog({
  enquiry,
  suggestedUnitPesewas,
  onClose,
  onSent,
}: {
  enquiry: Enquiry;
  suggestedUnitPesewas: number | null;
  onClose: () => void;
  onSent: (order: OrderSummary) => void;
}) {
  const [unitPrice, setUnitPrice] = useState(suggestedUnitPesewas ? (suggestedUnitPesewas / 100).toFixed(2) : "");
  const [quantity, setQuantity] = useState(String(enquiry.quantity ?? 1));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = Math.round(Number(unitPrice.replace(/[^\d.]/g, "")) * 100) * Number(quantity);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId: enquiry.id, unitPrice, quantity: Number(quantity), note }),
      });
      const data = (await res.json().catch(() => ({}))) as { order?: OrderSummary; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Could not send the quote.");
      onSent(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the quote.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <form onSubmit={send} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-navy">Send a quote</h2>
            <p className="mt-1 text-xs text-navy/60">
              {enquiry.topic?.replace(/^Partner: /, "") ?? enquiry.name} · {enquiry.productName}. They get an
              email with a Paystack payment link, and a Pay now button in their portal. Sending again
              replaces the earlier link.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-navy/50 hover:bg-navy/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-navy">
            Unit price (GH₵)
            <input required inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={field} />
          </label>
          <label className="block text-xs font-bold text-navy">
            Quantity
            <input required inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold text-navy">
          Note to the partner (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Delivery terms, timing, what is included…"
            className={`${field} py-2`}
          />
        </label>
        <p className="mt-3 text-sm text-navy">
          Total: <strong>{Number.isFinite(total) && total > 0 ? formatPrice(total) : "—"}</strong>
          <span className="block text-[11px] text-navy/50">Delivery is arranged with the partner; add any delivery charge to the unit price or note.</span>
        </p>
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
            {busy ? "Sending…" : "Send quote"}
          </button>
        </div>
      </form>
    </div>
  );
}
