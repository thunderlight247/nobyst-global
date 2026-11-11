import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import ProductBrowser from "@/components/ProductBrowser";
import { categories, site } from "@/data/site";
import { listProducts } from "@/lib/products";
import { whatsappLink } from "@/lib/contact-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Phones, audio, charging, cases and everyday phone accessories supplied by NOBYST GLOBAL LTD in Techiman, Ghana. Confirm availability on WhatsApp.",
};

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await listProducts();
  const feature =
    products.find((p) => p.slug === "over-ear-wireless-headphones") ?? products[0] ?? null;

  const tiles = categories.map((name) => {
    const inCategory = products.filter((p) => p.category === name);
    return { name, count: inCategory.length, image: inCategory[0]?.image ?? null };
  });

  return (
    <>
      {/* Opening band */}
      <section className="border-b border-neutral-200/70 bg-[#F7F6F3]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-navy px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
                Retail division
              </span>
              <h1 className="mt-5 font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-[3.5rem]">
                Everyday tech,
                <br />
                ready to take home.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-navy/70 text-pretty sm:text-lg">
                Phones, audio, charging, cases and the accessories that go with them. Message us on
                WhatsApp to confirm stock, colours and model fit before you travel to us.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={whatsappLink(
                    `Hello ${site.short}, I would like to ask about a product in your catalogue.`
                  )}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-royal active:scale-[0.98] sm:text-base"
                >
                  <MessageCircle size={17} aria-hidden />
                  Ask about a product
                </a>
                <Link
                  href="#catalogue"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-navy/20 bg-white px-6 py-3 text-sm font-bold text-navy transition-colors hover:border-navy sm:text-base"
                >
                  Browse the catalogue
                </Link>
              </div>
              <p className="mt-4 text-xs text-navy/50">
                {products.length} product lines · {site.location}
              </p>
            </div>

            {feature && (
              <div className="lg:col-span-5">
                <Link
                  href={`/products/${feature.slug}`}
                  className="group block overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-neutral-200/70"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F1EFEA]">
                    <Image
                      src={feature.image}
                      alt={feature.imageAlt}
                      fill
                      priority
                      sizes="(min-width:1024px) 40vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-navy/45">
                        Featured
                      </span>
                      <span className="mt-0.5 block font-display text-base font-bold text-navy">
                        {feature.name}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-navy/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-royal"
                    />
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Shop by category
          </h2>
          <Link href="#catalogue" className="shrink-0 text-sm font-bold text-royal hover:text-navy">
            View all
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {tiles.map((tile) => (
            <li key={tile.name}>
              <Link
                href={`/products?category=${encodeURIComponent(tile.name)}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-royal/25"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F1EFEA]">
                  {tile.image && (
                    <Image
                      src={tile.image}
                      alt=""
                      fill
                      sizes="(min-width:640px) 30vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 p-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-navy">{tile.name}</span>
                    <span className="mt-0.5 block text-[11px] text-navy/50">
                      {tile.count} {tile.count === 1 ? "line" : "lines"}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    aria-hidden
                    className="shrink-0 text-navy/35 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-royal"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Catalogue */}
      <section
        id="catalogue"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          The catalogue
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/70 sm:text-base">
          Filter by category, search by name, or narrow the list to what works with your phone. Prices
          and colours are confirmed on WhatsApp or in store.
        </p>

        <div className="mt-8">
          <ProductBrowser products={products} initialCategory={category} />
        </div>
      </section>
    </>
  );
}
