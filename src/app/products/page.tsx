import type { Metadata } from "next";
import ProductBrowser from "@/components/ProductBrowser";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse phone accessories from NOBYST GLOBAL LTD in Techiman, Ghana.",
};

export default function Products() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-3xl">
        <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-xs font-bold text-royal uppercase tracking-wider">
          Retail Catalog
        </span>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy">
          Phone accessories
        </h1>
        <p className="mt-4 text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
          An illustrative overview of the accessory lines we stock and distribute in Techiman. Contact our team directly on WhatsApp to confirm real-time availability and model fit.
        </p>
      </div>

      <div className="mt-12">
        <ProductBrowser />
      </div>
    </section>
  );
}
