import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MessageCircle, Package, ShieldCheck } from "lucide-react";
import BulkOrderForm from "@/components/BulkOrderForm";
import ProductGallery from "@/components/ProductGallery";
import StockBadge from "@/components/StockBadge";
import { formatPrice } from "@/lib/catalogue";
import { phoneGroups, site } from "@/data/site";
import { getProductBySlug, listRelated } from "@/lib/products";
import { whatsappLink } from "@/lib/contact-links";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: `${product.description} Compatibility and bulk orders from ${site.name}, Techiman.`,
    openGraph: {
      title: `${product.name} | ${site.name}`,
      description: product.description,
      images: [{ url: product.image, alt: product.imageAlt }],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const fits = phoneGroups.filter((g) => product.fits.includes(g.id));
  const related = await listRelated(product.category, product.id);
  const isDevice = product.category === "Phones & devices";
  const price = formatPrice(product.pricePesewas);
  const photos = [
    { src: product.image, alt: product.imageAlt },
    ...product.gallery.map((src) => ({ src, alt: "" })),
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/products"
        className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold text-navy/70 transition-colors hover:text-royal"
      >
        <ArrowLeft size={15} aria-hidden />
        All products
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery photos={photos} alt={product.imageAlt} />

        <div>
          <span className="inline-block rounded-full bg-gold/15 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            {product.category}
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {price ? (
              <p className="font-display text-2xl font-extrabold text-navy">{price}</p>
            ) : (
              <p className="text-sm font-bold text-navy/70">Ask for price</p>
            )}
            <StockBadge status={product.stockStatus} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-navy/75 sm:text-base">{product.description}</p>

          <ul className="mt-6 space-y-2.5">
            {product.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed text-navy/80">
                <Check className="mt-0.5 shrink-0 text-gold-600" size={16} aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {!isDevice && (
            <div className="mt-7 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-royal">
                <ShieldCheck size={14} aria-hidden />
                <h2>Phone compatibility</h2>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {fits.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-full border border-navy/10 bg-royal-50 px-3 py-1.5 text-xs font-medium text-navy/80"
                  >
                    {g.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-navy/60">
                Cases and screen guards fit specific models. Send your exact phone model on WhatsApp and
                we will confirm fit and availability.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={whatsappLink(
                `Hello ${site.short}, I would like to check availability for: ${product.name}. My phone model is: `
              )}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-royal"
            >
              <MessageCircle size={17} aria-hidden />
              Check availability
            </a>
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(`Availability: ${product.name}`)}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-navy/20 bg-white px-6 py-3 text-sm font-bold text-navy transition-colors hover:border-royal hover:text-royal"
            >
              Email us
            </a>
          </div>
          <p className="mt-3 text-xs text-navy/55">
            Prices, colours and stock are confirmed on WhatsApp or in store.
          </p>
        </div>
      </div>

      <div className="mt-12 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:p-9">
        <div className="grid gap-7 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-royal">
              <Package size={15} aria-hidden />
              <span>Bulk &amp; wholesale</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy">Ordering for a shop or team?</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-navy/75">
              Tell us how many units you need and we will confirm bulk pricing, availability and
              collection or delivery in Techiman. Minimum bulk enquiry is 5 units.
            </p>
          </div>
          <BulkOrderForm product={product.name} />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold text-navy sm:text-2xl">More in {product.category}</h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-md"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-royal-100/50">
                    <Image
                      src={p.image}
                      alt={p.imageAlt}
                      fill
                      sizes="(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-display font-bold text-navy group-hover:text-royal">{p.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-navy/65">{p.description}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
