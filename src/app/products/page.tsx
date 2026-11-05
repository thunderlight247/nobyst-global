import type { Metadata } from "next";
import ProductBrowser from "@/components/ProductBrowser";
export const metadata: Metadata = { title: "Products", description: "Browse phone accessories from NOBYST GLOBAL LTD in Techiman, Ghana." };
export default function Products() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="font-display text-5xl font-extrabold">Phone accessories</h1>
      <p className="mb-10 mt-3 max-w-2xl text-navy/75">A preview of the range we deal in. Message us to confirm what is available.</p>
      <ProductBrowser />
    </section>
  );
}
