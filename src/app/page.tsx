import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LifeBuoy, ShieldCheck, Truck } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import { listCategories } from "@/lib/categories";
import { formatPrice, stockLabel } from "@/lib/catalogue";
import { listProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#F1EFEA]">
        <Image
          src={p.image}
          alt={p.imageAlt}
          fill
          sizes="(min-width:1024px) 20vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50">{p.category}</span>
        <span className="line-clamp-2 text-xs font-bold leading-snug text-navy sm:text-sm">{p.name}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs sm:text-sm">
          <span className="font-bold text-royal">{formatPrice(p.pricePesewas) ?? "Ask for price"}</span>
          <span className="text-[10px] text-navy/55">{stockLabel(p.stockStatus)}</span>
        </span>
      </div>
    </Link>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-bold text-royal hover:text-navy">
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function Home() {
  const [categories, products] = await Promise.all([
    listCategories().then((all) => all.filter((c) => !c.parentId)),
    listProducts(),
  ]);
  const available = products.filter((p) => p.stockStatus !== "out_of_stock");
  const featured = available.slice(0, 6);
  const newest = available.slice(6, 12);

  return (
    <>
      <HeroSection />

      {/* Category strip */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Shop by category</p>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categories.map((cat) => (
              <li key={cat.id} className="shrink-0">
                <Link
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="inline-flex min-h-[38px] items-center rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:border-gold hover:text-gold sm:text-sm"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust strip */}
      <ul className="mx-auto mt-4 grid max-w-6xl grid-cols-3 gap-2 px-4 text-center text-[11px] font-bold text-navy sm:px-6 sm:text-sm lg:px-8">
        <li className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-3 shadow-sm">
          <Truck size={15} aria-hidden className="text-royal" /> Delivery
        </li>
        <li className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-3 shadow-sm">
          <ShieldCheck size={15} aria-hidden className="text-royal" /> Quality checked
        </li>
        <li className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-3 shadow-sm">
          <LifeBuoy size={15} aria-hidden className="text-royal" /> Support
        </li>
      </ul>

      {featured.length > 0 && (
        <Section title="Featured products" href="/products">
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-6">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {newest.length > 0 && (
        <Section title="New arrivals" href="/products">
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-6">
            {newest.map((p) => (
              <li key={p.id}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer links for shoppers */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-20 lg:px-8">
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          {[
            { href: "/support", title: "Customer support", text: "Questions about a product, order or payment." },
            { href: "/account", title: "Your account", text: "Sign in to check out and view your orders." },
            { href: "/partnerships", title: "Partner with us", text: "Supplier or distributor? Tell us how we can work together." },
          ].map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal/40 hover:shadow-md"
              >
                <span>
                  <span className="block font-display text-base font-bold text-navy">{g.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-navy/70">{g.text}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="mt-1 shrink-0 text-navy/40 transition-transform group-hover:translate-x-1 group-hover:text-royal" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
