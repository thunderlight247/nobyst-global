"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import StockBadge from "@/components/StockBadge";
import { formatPrice } from "@/lib/catalogue";
import type { Product } from "@/lib/products";

type Status = { kind: "ok" | "error"; text: string } | null;

export default function AdminCatalogue({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? Its uploaded photo is removed too.`)) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setStatus({ kind: "ok", text: `Deleted ${product.name}.` });
      router.refresh();
    } catch {
      setStatus({ kind: "error", text: "That product could not be deleted." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-gold/15 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            Staff tools
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            Catalogue admin
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-navy/70">
            Changes appear on the public product pages immediately. Keep this URL private — there is no
            sign-in yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-navy/20 bg-white px-5 py-3 text-sm font-bold text-navy transition-colors hover:border-royal hover:text-royal"
          >
            Payload Operations &rarr;
          </Link>
          <button
            type="button"
            onClick={() => setEditor("new")}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-royal"
          >
            <Plus size={17} aria-hidden />
            Add product
          </button>
        </div>
      </div>

      {status && (
        <p
          role="status"
          className={`mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            status.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.kind === "ok" ? (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
          )}
          {status.text}
        </p>
      )}

      <div className="mt-7 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-navy/50">
        <span>{initialProducts.length} product ranges</span>
        <span>Public URL: /products</span>
      </div>

      {initialProducts.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-navy/20 bg-white p-10 text-center">
          <p className="font-display text-lg font-bold text-navy">No products yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy/70">
            Add your first product to publish it to the catalogue and its own detail page.
          </p>
          <button
            type="button"
            onClick={() => setEditor("new")}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-royal px-5 py-2.5 text-xs font-bold text-white hover:bg-navy"
          >
            <Plus size={15} aria-hidden />
            Add product
          </button>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-navy/5 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
          {initialProducts.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-royal-100/50">
                <Image src={p.image} alt="" fill sizes="112px" className="object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-navy">{p.name}</p>
                <p className="mt-0.5 text-xs text-navy/60">
                  {p.category} · {p.fits.length} phone families · /products/{p.slug}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-navy/75">
                    {formatPrice(p.pricePesewas) ?? "No price set"}
                  </span>
                  <StockBadge status={p.stockStatus} />
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditor(p)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-navy/15 px-4 py-2 text-xs font-bold text-navy transition-colors hover:border-royal hover:text-royal"
                >
                  <Pencil size={14} aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden />
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor && (
        <ProductForm
          product={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setEditor(null);
            setStatus({
              kind: "ok",
              text: editor === "new" ? `Added ${saved.name}.` : `Updated ${saved.name}.`,
            });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
