"use client";
import { useMemo, useState } from "react";
import { Search, MessageCircle, AlertCircle } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { categoryImage } from "@/data/images";
import { categories, products, site } from "@/data/site";

export default function ProductBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())
      ),
    [q, cat]
  );

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:w-80">
          <span className="sr-only">Search products by keyword</span>
          <Search className="absolute left-3.5 top-3.5 text-navy/50" size={18} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accessories..."
            className="w-full rounded-full border border-navy/20 bg-white py-3 pl-11 pr-4 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
        </label>

        {/* Category Filters with >=44px Touch Targets */}
        <div
          role="group"
          aria-label="Filter products by category"
          className="flex flex-wrap gap-2 sm:gap-2.5"
        >
          {["All", ...categories].map((c) => {
            const isSelected = cat === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setCat(c)}
                className={`min-h-[44px] rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "bg-navy text-white shadow-md"
                    : "border border-navy/15 bg-white text-navy/80 hover:border-royal hover:text-royal"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Counter with Compliant Contrast */}
      <p className="mt-6 text-sm font-medium text-navy/80" aria-live="polite">
        Showing {list.length} {list.length === 1 ? "product" : "products"}
        <span className="text-navy/60 font-normal"> · Sample catalog reference</span>
      </p>

      {/* Empty State */}
      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-600">
            <AlertCircle size={24} aria-hidden />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-navy">No products match your search</p>
          <p className="mt-2 text-sm text-navy/80">
            Try a different search term or select another category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCat("All");
            }}
            className="mt-5 inline-block rounded-full bg-navy px-6 py-2.5 text-xs font-bold text-white hover:bg-royal transition-colors"
          >
            Reset filters
          </button>
        </div>
      ) : (
        /* Product Grid */
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <li
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg"
            >
              <div className="relative h-44 w-full overflow-hidden bg-royal-100/50">
                <SmartImage
                  name={categoryImage[p.category] ?? "phones"}
                  className="h-full w-full"
                  imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs font-bold text-gold-600 uppercase tracking-wider">
                  {p.category}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold text-navy group-hover:text-royal transition-colors">
                  {p.name}
                </h3>
                <p className="mt-2 flex-1 text-sm text-navy/80 leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-5 pt-4 border-t border-navy/5">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                      `Hello NOBYST, I would like to ask about availability for: ${p.name}`
                    )}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-royal hover:text-navy transition-colors active:scale-95"
                  >
                    <MessageCircle size={15} aria-hidden />
                    <span>Inquire on WhatsApp</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
