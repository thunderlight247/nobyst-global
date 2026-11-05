import type { Metadata } from "next";
import Link from "next/link";
import { Hourglass, CheckCircle2, ArrowRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { Icon } from "@/lib/icons";
import { current, future } from "@/data/site";
import type { ImageKey } from "@/data/images";

export const metadata: Metadata = {
  title: "Our Businesses",
  description: "What NOBYST GLOBAL LTD does today, and the business areas it plans to grow into.",
};

const momoPoints = [
  "Agency services for everyday cash and digital transactions",
  "Served directly from our commercial location in Techiman, Ghana",
  "Transaction types and network partner institutions confirmed at point of service",
];

export default function Businesses() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-xs font-bold text-royal uppercase tracking-wider">
            Commercial Portfolio
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy">
            Our businesses
          </h1>
          <p className="mt-4 text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
            Active commercial operations serving our local market today, paired with structured strategic initiatives for future regional growth.
          </p>
        </div>

        {/* Operating Today */}
        <div className="mt-14">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-royal-100 text-royal">
              <CheckCircle2 size={18} aria-hidden />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">
              Operating today
            </h2>
          </div>

          <div className="mt-8 space-y-8">
            {current.map((c, i) => (
              <article
                key={c.title}
                className="group grid overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-all duration-300 hover:border-royal/30 hover:shadow-xl md:grid-cols-2"
              >
                <div className={`relative h-64 sm:h-72 md:h-full overflow-hidden bg-royal-100 ${i % 2 ? "md:order-2" : ""}`}>
                  <SmartImage
                    name={c.image as ImageKey}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-navy shadow-sm">
                    {i === 0 ? "Retail Division" : "Agency Banking"}
                  </div>
                </div>

                <div className="p-8 sm:p-10 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-royal text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                      <Icon name={c.icon} />
                    </span>
                    <h3 className="mt-5 font-display text-2xl font-bold text-navy group-hover:text-royal transition-colors">
                      {c.title}
                    </h3>
                    <p className="mt-3 text-base text-navy/80 leading-relaxed text-pretty">
                      {c.text}
                    </p>

                    {i === 1 && (
                      <ul className="mt-5 space-y-2 rounded-xl bg-paper p-4 text-sm text-navy/85">
                        {momoPoints.map((m) => (
                          <li key={m} className="flex items-start gap-2">
                            <span className="text-royal font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-8 pt-4 border-t border-navy/5">
                    <Link
                      href={i === 0 ? "/products" : "/contact"}
                      className="group/link inline-flex items-center gap-2 font-bold text-royal hover:text-navy transition-colors"
                    >
                      <span>{i === 0 ? "Browse accessories catalog" : "Inquire about agency services"}</span>
                      <ArrowRight size={16} aria-hidden className="transition-transform duration-200 group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Future Expansion Roadmap */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pb-20 sm:pb-28">
        <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold/15 px-3.5 py-1 text-xs font-bold text-gold-600 uppercase tracking-wider">
            <Hourglass size={14} aria-hidden />
            <span>Planned Strategic Pipeline</span>
          </div>

          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy">
            Future growth areas
          </h2>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
            These represent strategic diversification ambitions mapped for phased expansion as infrastructure and market partnerships mature.
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li
                key={f.title}
                className="group overflow-hidden rounded-xl border border-navy/10 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
              >
                <div className="relative h-36 w-full overflow-hidden bg-royal-100/50">
                  <SmartImage
                    name={f.image as ImageKey}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
                    sizes="(min-width:1024px) 33vw, 100vw"
                  />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600 transition-colors group-hover:bg-gold group-hover:text-navy">
                    <Icon name={f.icon} />
                  </span>
                  <span className="text-sm font-bold text-navy group-hover:text-royal transition-colors">
                    {f.title}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link
              href="/partnerships"
              className="inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-xl active:scale-[0.98]"
            >
              <span>Explore a commercial partnership</span>
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
