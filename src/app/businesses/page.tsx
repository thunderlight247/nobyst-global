import type { Metadata } from "next";
import Link from "next/link";
import { Hourglass, CheckCircle2, ArrowRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { Icon } from "@/lib/icons";
import { current, future } from "@/data/site";
import type { ImageKey } from "@/data/images";

export const metadata: Metadata = {
  title: "Our Businesses",
  description:
    "The two divisions NOBYST GLOBAL LTD operates today in Techiman, Ghana, and the business areas planned for future expansion.",
};

export default function Businesses() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
            Commercial portfolio
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
            Our businesses
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-navy/75 text-pretty sm:text-lg">
            Two divisions operating today in Techiman, and a clearly separated pipeline of sectors we
            plan to enter as the company grows.
          </p>
        </div>

        {/* Operating today */}
        <div className="mt-10 sm:mt-14">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-royal-100 text-royal">
              <CheckCircle2 size={16} aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Operating today</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-navy/70">
            These divisions are open and serving customers now.
          </p>

          <div className="mt-7 space-y-6 sm:mt-8 sm:space-y-8">
            {current.map((c, i) => (
              <article
                key={c.title}
                id={i === 1 ? "agency" : undefined}
                className="group grid scroll-mt-24 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-all duration-300 hover:border-royal/30 hover:shadow-xl md:grid-cols-2"
              >
                <div
                  className={`relative h-52 overflow-hidden bg-royal-100 sm:h-64 md:h-full ${
                    i % 2 ? "md:order-2" : ""
                  }`}
                >
                  <SmartImage
                    name={c.image as ImageKey}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(min-width:768px) 50vw, 100vw"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-navy shadow-sm backdrop-blur-md">
                    {c.tag}
                  </div>
                </div>

                <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                  <div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-royal text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                      <Icon name={c.icon} size={22} />
                    </span>
                    <h3 className="mt-4 font-display text-xl font-bold text-navy transition-colors group-hover:text-royal sm:text-2xl">
                      {c.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy/75 sm:text-base">{c.text}</p>

                    <ul className="mt-4 space-y-2 rounded-xl bg-paper p-4 text-sm text-navy/80">
                      {c.points.map((m) => (
                        <li key={m} className="flex items-start gap-2">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-navy/5 pt-4">
                    <Link
                      href={c.href}
                      className="group/link inline-flex items-center gap-2 text-sm font-bold text-royal transition-colors hover:text-navy"
                    >
                      <span>{c.cta}</span>
                      <ArrowRight
                        size={16}
                        aria-hidden
                        className="transition-transform duration-200 group-hover/link:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Planned expansion */}
      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6 sm:pb-24 lg:px-8">
        <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-6 shadow-sm sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600 sm:text-xs">
            <Hourglass size={13} aria-hidden />
            <span>Planned expansion — not operating today</span>
          </div>

          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-navy sm:text-4xl">
            Future growth areas
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/75 sm:text-base">
            These are strategic diversification plans, not current services. Each area will be
            introduced in phases as capabilities, partners and market conditions allow.
          </p>

          <ul className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li
                key={f.title}
                className="group rounded-xl border border-navy/10 bg-white/85 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600 transition-colors group-hover:bg-gold group-hover:text-navy">
                    <Icon name={f.icon} size={18} />
                  </span>
                  <span className="rounded-full border border-gold-600/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-600">
                    Planned
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-navy">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy/70">{f.text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Link
              href="/partnerships"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-xl active:scale-[0.98] sm:text-base"
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
