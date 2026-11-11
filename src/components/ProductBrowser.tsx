"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MessageCircle, AlertCircle, Smartphone, ChevronDown, ArrowRight } from "lucide-react";
import { categories, phoneGroups, site } from "@/data/site";
import type { PhoneGroupId } from "@/data/site";
import type { Product } from "@/lib/products";
import { whatsappLink } from "@/lib/contact-links";
import { motion } from "framer-motion";

export default function ProductBrowser({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(
    initialCategory && (categories as readonly string[]).includes(initialCategory) ? initialCategory : "All"
  );
  const [phone, setPhone] = useState<PhoneGroupId | "all">("all");

  const activePhone = phoneGroups.find((g) => g.id === phone);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (phone === "all" || p.fits.includes(phone)) &&
          `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())
      ),
    [q, cat, phone, products]
  );

  const reset = () => {
    setQ("");
    setCat("All");
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
              className="min-h-[44px] w-full rounded-full border border-navy/20 bg-white py-2.5 pl-11 pr-4 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
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
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-full border border-navy/20 bg-white py-2.5 pl-11 pr-9 text-sm text-navy shadow-sm transition-all focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
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
                className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 sm:px-5 sm:text-sm ${
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

      <p className="mt-5 text-sm font-medium text-navy/80" aria-live="polite">
        Showing {list.length} of {products.length} product ranges
        {activePhone ? ` for ${activePhone.label}` : ""}
      </p>
      {activePhone && (
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy/55">
          Wired earphones use a 3.5&nbsp;mm jack, and cases and screen guards fit common models. Tell us
          your exact model on WhatsApp to confirm fit before ordering.
        </p>
      )}

      {list.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-600">
            <AlertCircle size={24} aria-hidden />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-navy">
            {products.length === 0 ? "The catalogue is being updated" : "No accessories match these filters"}
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
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: "easeOut" }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-[box-shadow,border-color,translate] duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg"
            >
              <Link
                href={`/products/${p.slug}`}
                aria-label={`View details for ${p.name}`}
                className="relative block h-40 w-full overflow-hidden bg-royal-100/50 sm:h-44"
              >
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </Link>

              <div className="flex flex-1 flex-col p-5">
                <span className="w-fit rounded-md border border-neutral-200/60 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  {p.category}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold leading-snug text-navy transition-colors group-hover:text-royal">
                  <Link href={`/products/${p.slug}`}>{p.name}</Link>
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/75">{p.description}</p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-200/60 pt-3">
                  <Link
                    href={`/products/${p.slug}`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold text-navy transition-colors hover:text-royal"
                  >
                    <span>View details</span>
                  </Link>
                  <Link
                    href={`/products/${p.slug}`}
                    aria-label={`Open ${p.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-all duration-200 group-hover:bg-royal group-hover:translate-x-0.5 active:scale-95"
                  >
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
                <div className="mt-2 flex">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={whatsappLink(
                      `Hello ${site.short}, I would like to ask about availability for: ${p.name}${
                        activePhone ? ` (my phone: ${activePhone.label})` : ""
                      }`
                    )}
                    className="inline-flex min-h-[40px] items-center gap-2 text-xs font-bold text-royal transition-colors hover:text-navy active:scale-95"
                  >
                    <MessageCircle size={15} aria-hidden />
                    <span>Check availability</span>
                  </a>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
