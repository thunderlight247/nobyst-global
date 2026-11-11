import Link from "next/link";
import { ArrowRight, CheckCircle2, Hourglass, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/contact-links";
import HeroRing from "@/components/HeroRing";
import SmartImage from "@/components/SmartImage";
import type { ImageKey } from "@/data/images";
import Reveal from "@/components/Reveal";
import { Icon } from "@/lib/icons";
import { site, current, future, values, categories } from "@/data/site";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(110%_85%_at_100%_0%,#20349B_0%,transparent_58%)] opacity-80"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(75%_65%_at_0%_100%,#101F78_0%,transparent_62%)]"
        />
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-gold/10 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-7 lg:pr-8">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold sm:text-xs">
                <span>{site.name}</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-gold/60" />
                <span className="text-white/55">{site.location}</span>
              </p>

              <h1 className="mt-5 max-w-xl font-display text-[2rem] font-extrabold leading-[1.07] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
                Building trust.
                <br />
                Delivering solutions.
                <br />
                <span className="text-gold">Growing together.</span>
              </h1>

              <div aria-hidden className="mt-6 h-px w-16 bg-gold/70" />

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/80 text-pretty sm:text-lg">
                {site.intro}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={whatsappLink(`Hello ${site.short}, I would like to make an enquiry.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-white hover:text-navy hover:shadow-xl active:scale-[0.98] sm:text-base"
                >
                  <MessageCircle size={18} aria-hidden />
                  Chat with us on WhatsApp
                </a>
                <Link
                  href="/businesses"
                  className="group inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98] sm:text-base"
                >
                  Explore our businesses
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-[48px] items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98] sm:text-base"
                >
                  About the company
                </Link>
                <Link
                  href="/partnerships"
                  className="group inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-bold text-white/80 transition-colors hover:text-gold"
                >
                  Partner with us
                  <ArrowRight
                    size={16}
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>

            {/* Company snapshot (desktop) */}
            <div className="relative lg:col-span-5">
              <div className="mb-4 grid h-56 grid-cols-3 grid-rows-2 gap-2 sm:h-64 sm:gap-3">
                <div className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl">
                  <SmartImage name="accessories" className="h-full w-full" sizes="40vw" />
                </div>
                <div className="relative overflow-hidden rounded-2xl">
                  <SmartImage name="phoneDetail" className="h-full w-full" sizes="20vw" />
                </div>
                <div className="relative overflow-hidden rounded-2xl">
                  <SmartImage name="payments" className="h-full w-full" sizes="20vw" />
                </div>
              </div>
              <div className="hidden lg:block">
                <HeroRing />
              </div>
              <div className="relative rounded-2xl border border-neutral-200/20 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-sm sm:p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                  Company snapshot
                </p>
                <ul className="mt-5 space-y-4">
                  {current.map((c) => (
                    <li key={c.title} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                      <span>
                        <span className="block text-sm font-bold text-white">{c.title}</span>
                        <span className="mt-0.5 block text-xs text-white/55">Operating today</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                    Planned expansion
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    General trading, import &amp; export, agriculture-related trade, technology and
                    logistics.
                  </p>
                  <p className="mt-2 text-[11px] text-white/45">Planned only — not yet operating.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-6 sm:pt-20 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">Shop by category</h2>
          <Link href="/products" className="shrink-0 text-sm font-bold text-royal hover:text-navy">
            View all
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {categories.map((cat) => (
            <li key={cat}>
              <Link
                href={`/products?category=${encodeURIComponent(cat)}`}
                className="group flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-neutral-200/60 bg-white p-4 text-sm font-bold text-navy shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal/40 hover:text-royal hover:shadow-md"
              >
                <span>{cat}</span>
                <ArrowRight size={16} aria-hidden className="shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Operating today */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-royal" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-royal sm:text-xs">
            Operating today
          </p>
        </div>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Our current operations
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/75 sm:text-base">
          Two active divisions, serving customers in Techiman and the wider Bono East Region.
        </p>

        <Reveal className="mt-8 grid gap-6 sm:mt-10 md:grid-cols-5">
          {current.map((c, i) => (
            <article
              key={c.title}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/40 hover:shadow-xl ${
                i === 0 ? "md:col-span-3" : "md:col-span-2"
              }`}
            >
              <div className="relative h-56 w-full overflow-hidden bg-navy sm:h-64">
                <SmartImage
                  name={c.image as ImageKey}
                  className="h-full w-full"
                  imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(min-width:768px) 50vw, 100vw"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
                <p className="absolute bottom-4 left-5 right-5 font-display text-xl font-bold text-white sm:text-2xl">
                  {c.title}
                </p>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-royal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal">
                  <CheckCircle2 size={12} aria-hidden />
                  Operating today
                </span>
                <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-lg bg-royal text-white">
                  <Icon name={c.icon} size={20} />
                </span>
                <h3 className="sr-only">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75">{c.text}</p>

                <ul className="mt-4 space-y-2 border-t border-navy/5 pt-4">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-navy/70">
                      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={c.href}
                  className="group/link mt-5 inline-flex items-center gap-2 text-sm font-bold text-royal transition-colors hover:text-navy"
                >
                  <span>{c.cta}</span>
                  <ArrowRight
                    size={16}
                    aria-hidden
                    className="transition-transform duration-200 group-hover/link:translate-x-1"
                  />
                </Link>
              </div>
            </article>
          ))}
        </Reveal>
      </section>

      {/* Planned expansion */}
      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-20 lg:px-8">
        <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-6 shadow-sm sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600 sm:text-xs">
            <Hourglass size={13} aria-hidden />
            <span>Planned, not yet operating</span>
          </div>

          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-navy sm:text-4xl">
            Where we are heading
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-navy/75 sm:text-base">
            {site.vision} These business areas form our expansion plan and are{" "}
            <strong className="font-bold text-navy">not operating today</strong>.
          </p>

          <Reveal as="ul" className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li
                key={f.title}
                className="group rounded-xl border border-neutral-200/60 bg-white/85 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
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
          </Reveal>

          <div className="mt-8">
            <Link
              href="/partnerships"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-royal active:scale-[0.98] sm:text-base"
            >
              Discuss a future partnership
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          What guides us
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy/75 sm:text-base">
          {site.mission}
        </p>

        <Reveal as="dl" className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="group rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg sm:p-6"
            >
              <div className="h-1 w-9 rounded-full bg-gold transition-all duration-300 group-hover:w-14 group-hover:bg-royal" />
              <dt className="mt-4 font-display text-xl font-bold tracking-tight text-royal transition-colors group-hover:text-navy sm:text-2xl">
                {v.title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-navy/75">{v.text}</dd>
            </div>
          ))}
        </Reveal>

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:mt-10 sm:p-9">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="font-serif text-2xl font-bold leading-none text-gold">
              &ldquo;
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-royal">
              The NOBYST operating philosophy
            </span>
          </div>
          <p className="font-display text-lg font-semibold leading-relaxed text-navy text-pretty sm:text-xl">
            {site.philosophy}
          </p>
        </div>
      </section>

      {/* Partnership CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-royal via-royal-700 to-navy p-7 text-white shadow-xl sm:p-12 lg:p-14">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-4xl">
                Supplier, distributor or collaborator?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85 text-pretty sm:text-lg">
                Tell us what you offer and how we could work together.
              </p>
            </div>
            <Link
              href="/partnerships"
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy shadow-md transition-all duration-200 hover:bg-white hover:shadow-xl active:scale-[0.98] sm:px-8 sm:py-4 sm:text-base"
            >
              <span>Send a partnership enquiry</span>
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
