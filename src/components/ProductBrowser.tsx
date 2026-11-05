"use client";
import { useMemo, useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { categoryImage } from "@/data/images";
import { categories, products, site } from "@/data/site";

export default function ProductBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const list = useMemo(() => products.filter((p) => (cat === "All" || p.category === cat) && `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())), [q, cat]);
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="relative block md:w-80">
          <span className="sr-only">Search products</span>
          <Search className="absolute left-3 top-3 text-navy/40" size={18} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="w-full rounded-full border border-navy/20 bg-white py-2.5 pl-10 pr-4" />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {["All", ...categories].map((c) => (
            <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-sm font-semibold ${cat === c ? "bg-navy text-white" : "bg-white ring-1 ring-navy/15 hover:ring-royal"}`}>{c}</button>
          ))}
        </div>
      </div>
      <p className="mt-6 text-sm text-navy/60" aria-live="polite">{list.length} {list.length === 1 ? "item" : "items"} shown. Sample entries only; no prices or stock are stated.</p>
      {list.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-10 text-center ring-1 ring-navy/10">
          <p className="font-semibold">Nothing matches that search.</p>
          <p className="mt-1 text-sm text-navy/70">Try another word, or ask us on WhatsApp whether we can source it.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-navy/10">
              <SmartImage name={categoryImage[p.category] ?? "phones"} className="h-40 w-full" sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" />
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold text-gold-600">{p.category}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{p.name}</h3>
                <p className="mt-1 flex-1 text-sm text-navy/70">{p.description}</p>
                <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hello NOBYST, I would like to ask about: ${p.name}`)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-royal hover:underline"><MessageCircle size={16} aria-hidden /> Ask about this</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
