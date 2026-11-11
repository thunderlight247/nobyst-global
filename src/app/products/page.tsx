import type { Metadata } from "next";
import ProductBrowser from "@/components/ProductBrowser";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Phone accessories supplied by NOBYST GLOBAL LTD in Techiman, Ghana. Confirm availability on WhatsApp.",
};

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await listProducts();

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="max-w-3xl">
        <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
          Retail division
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
          Accessories we supply
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-navy/75 text-pretty sm:text-lg">
          Our Techiman retail division supplies everyday phone accessories. Message us on WhatsApp to
          confirm current availability, colours and model fit.
        </p>
      </div>

      <div className="mt-9 sm:mt-12">
        <ProductBrowser products={products} initialCategory={category} />
      </div>
    </section>
  );
}
