"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; minQuantity: number };

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

/** Bulk-order request form for the partner portal. Disabled when an admin is previewing. */
export default function PartnerRequestForm({ options, preview }: { options: Option[]; preview: boolean }) {
  const router = useRouter();
  const [productId, setProductId] = useState(options[0]?.id ?? "");
  const selected = options.find((o) => o.id === productId);
  const [quantity, setQuantity] = useState(String(options[0]?.minQuantity ?? 5));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/partner/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: Number(quantity),
          phone: data.phone,
          message: data.message,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not send your request.");
      setNotice("Request sent. Our team will confirm price, stock and delivery with you.");
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return <p className="text-sm text-navy/60">No wholesale items are listed yet. Check back soon.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <label className="block text-xs font-bold text-navy">
          Product
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const next = options.find((o) => o.id === e.target.value);
              if (next && Number(quantity) < next.minQuantity) setQuantity(String(next.minQuantity));
            }}
            className={field}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-navy">
          Units
          <input
            type="number"
            min={selected?.minQuantity ?? 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={field}
            required
          />
        </label>
      </div>
      {selected && <p className="-mt-2 text-[11px] text-navy/55">Minimum {selected.minQuantity} units.</p>}
      <label className="block text-xs font-bold text-navy">
        Phone for this order (optional)
        <input name="phone" maxLength={40} className={field} placeholder="+233…" />
      </label>
      <label className="block text-xs font-bold text-navy">
        Notes (optional)
        <textarea
          name="message"
          maxLength={2000}
          rows={3}
          className={field}
          placeholder="Colours, delivery location, timing…"
        />
      </label>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      {notice && <p className="text-sm font-bold text-emerald-700">{notice}</p>}
      <button
        type="submit"
        disabled={busy || preview}
        className="min-h-[44px] rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-60"
      >
        {preview ? "Preview only (admins cannot send)" : busy ? "Sending…" : "Send bulk request"}
      </button>
    </form>
  );
}
