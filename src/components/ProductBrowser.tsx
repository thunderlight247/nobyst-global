"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MessageCircle, AlertCircle, Smartphone, ChevronDown, ArrowRight } from "lucide-react";
import { categories, phoneGroups, site } from "@/data/site";
import type { PhoneGroupId } from "@/data/site";
import type { Product } from "@/lib/products";
import StockBadge from "@/components/StockBadge";
import { formatPrice } from "@/lib/catalogue";
import { whatsappLink } from "@/lib/contact-links";
import { motion } from "framer-motion";
import { useNobystStore } from "@/store/useStore";

// Phones are devices, not accessories for a phone, so they stay out of the model filter.
const DEVICE_CATEGORY = "Phones & devices";

export default function ProductBrowser({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const storeCategory = useNobystStore((s) => s.selectedCategory);
  const setStoreCategory = useNobystStore((s) => s.setSelectedCategory);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(() => {
    if (initialCategory && (categories as readonly string[]).includes(initialCategory)) {
      return initialCategory;
    }
    if (storeCategory && storeCategory !== "All") {
      return storeCategory;
    }
    return "All";
  });
  const [phone, setPhone] = useState<PhoneGroupId | "all">("all");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");

  const handleCategoryChange = (newCat: string) => {
    setCat(newCat);
    setStoreCategory(newCat);
  };

  const activePhone = phoneGroups.find((g) => g.id === phone);

  const list = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchesCategory = cat === "All" || p.category === cat;
      const matchesPhone =
        phone === "all" || (p.category !== DEVICE_CATEGORY && p.fits.includes(phone));
      const matchesQuery = `${p.name} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(q.toLowerCase());
      return matchesCategory && matchesPhone && matchesQuery;
    });
    // Products without a price sort last for price sorts.
    const priceOf = (p: Product) => p.pricePesewas ?? Number.POSITIVE_INFINITY;
    if (sort === "price-asc") return [...filtered].sort((a, b) => priceOf(a) - priceOf(b));
    if (sort === "price-desc") {
      return [...filtered].sort((a, b) => {
        const pa = a.pricePesewas ?? Number.NEGATIVE_INFINITY;
        const pb = b.pricePesewas ?? Number.NEGATIVE_INFINITY;
        return pb - pa;
      });
    }
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [q, cat, phone, sort, products]);

  const reset = () => {
    setQ("");
    handleCategoryChange("All");
    setPhone("all");
  };

  return (
    <div>
      {/* Search, phone and category filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:w-60 lg:w-64">
            <span className="sr-only">Search products by keyword</span>
            <Search className="absolute left-3.5 top-3.5 text-navy/50" size={18} aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search accessories..."
              className="min-h-[44px] w-full rounded-full border border-navy/15 bg-white py-2.5 pl-11 pr-4 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </label>

          <label className="relative block w-full sm:w-60 lg:w-64">
            <span className="sr-only">Filter accessories by your phone model</span>
            <Smartphone
              className="pointer-events-none absolute left-3.5 top-3.5 text-navy/50"
              size={18}
              aria-hidden
            />
            <select
              value={phone}
              onChange={(e) => setPhone(e.target.value as PhoneGroupId | "all")}
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-full border border-navy/15 bg-white py-2.5 pl-11 pr-9 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            >
              <option value="all">All phones</option>
              {phoneGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-3.5 text-navy/50"
              size={16}
              aria-hidden
            />
          </label>
        </div>

        <label className="relative block w-full sm:w-52">
          <span className="sr-only">Sort products</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="min-h-[44px] w-full cursor-pointer appearance-none rounded-full border border-navy/15 bg-white py-2.5 pl-4 pr-9 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          >
            <option value="featured">Sort: Default</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-3.5 text-navy/50"
            size={16}
            aria-hidden
          />
        </label>

        <div
          role="group"
          aria-label="Filter products by category"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-0.5 no-scrollbar sm:mx-0 sm:flex-wrap sm:gap-2.5 sm:overflow-visible sm:px-0"
        >
          {["All", ...categories].map((c) => {
            const isSelected = cat === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleCategoryChange(c)}
                className={`min-h-[44px] shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 sm:px-5 sm:text-sm ${
                  isSelected
                    ? "bg-navy text-white shadow-md"
                    : "bg-white text-navy/70 ring-1 ring-neutral-200/80 hover:text-royal hover:ring-royal/40"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-navy/80" aria-live="polite">
          Showing {list.length} of {products.length} product lines
          {activePhone ? ` for ${activePhone.label}` : ""}
        </p>
        {(cat !== "All" || phone !== "all" || q) && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-bold text-royal hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
      {activePhone && (
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy/55">
          Wired earphones use a 3.5&nbsp;mm jack, and cases and screen guards fit specific models. Tell
          us your exact model on WhatsApp to confirm fit before ordering.
        </p>
      )}

      {list.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center ring-1 ring-neutral-200/70">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-600">
            <AlertCircle size={24} aria-hidden />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-navy">
            {products.length === 0 ? "The catalogue is being updated" : "Nothing matches these filters"}
          </p>
          <p className="mt-2 text-sm text-navy/75">
            {products.length === 0
              ? "Please check back shortly, or message us on WhatsApp for current stock."
              : "Try a different search term, category or phone selection."}
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-block min-h-[44px] rounded-full bg-navy px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-royal"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: "easeOut" }}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-royal/25"
            >
              <Link
                href={`/products/${p.slug}`}
                aria-label={`View details for ${p.name}`}
                className="relative block aspect-square w-full overflow-hidden bg-[#F1EFEA]"
              >
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                {p.gallery.length > 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-navy shadow-sm backdrop-blur-sm">
                    {p.gallery.length + 1} photos
                  </span>
                )}
              </Link>

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-navy/45">
                  {p.category}
                </span>
                <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-navy sm:mt-2">
                  <Link href={`/products/${p.slug}`} className="transition-colors hover:text-royal">
                    {p.name}
                  </Link>
                </h3>
                <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-navy/65 sm:mt-2 sm:text-sm">
                  {p.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-navy">
                    {formatPrice(p.pricePesewas) ?? "Ask for price"}
                  </span>
                  <StockBadge status={p.stockStatus} />
                </div>

                <div className="mt-3.5 flex items-center gap-2">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={whatsappLink(
                      `Hello ${site.short}, I would like to ask about availability for: ${p.name}${
                        activePhone ? ` (my phone: ${activePhone.label})` : ""
                      }`
                    )}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-royal active:scale-95"
                  >
                    <MessageCircle size={15} aria-hidden />
                    <span>Confirm on WhatsApp</span>
                  </a>
                  <Link
                    href={`/products/${p.slug}`}
                    aria-label={`Open ${p.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 text-navy transition-all duration-200 hover:border-navy hover:bg-navy hover:text-white active:scale-95"
                  >
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
