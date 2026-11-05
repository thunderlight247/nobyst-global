import Link from "next/link";
import { ArrowRight, Hourglass, Info } from "lucide-react";
import HeroRing from "@/components/HeroRing";
import SmartImage from "@/components/SmartImage";
import type { ImageKey } from "@/data/images";
import Reveal from "@/components/Reveal";
import { Icon } from "@/lib/icons";
import { site, current, future, values } from "@/data/site";

export default function Home() {
  return (
    <>
      {/* 1. Hero Section - Fast, accessible server markup with the signature branded HeroRing */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <HeroRing />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          {/* User requirement: Restored exactly to original branding text */}
          <p className="mb-5 text-sm font-semibold text-gold">{site.name}, {site.location}</p>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-balance max-w-4xl">
            Building trust.<br />
            Delivering solutions.<br />
            <span className="text-gold">Growing together.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-white/85 leading-relaxed text-pretty">
            {site.intro}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5 sm:gap-4">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-bold text-navy shadow-md transition-all duration-200 hover:bg-white hover:shadow-xl active:scale-[0.98]"
            >
              <span>Browse products</span>
              <ArrowRight size={18} aria-hidden className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/30 bg-white/5 px-6 py-3.5 font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98]"
            >
              About us
            </Link>
            <Link
              href="/partnerships"
              className="rounded-full border border-white/30 bg-white/5 px-6 py-3.5 font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98]"
            >
              Partner with us
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Operational Capabilities: What we do today */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy text-balance">
              What we do today
            </h2>
            <p className="mt-3 max-w-2xl text-base sm:text-lg text-navy/80 text-pretty">
              Everyday connectivity and reliable community financial services serving Techiman and beyond.
            </p>
          </div>
        </div>

        <Reveal className="mt-10 grid gap-8 md:grid-cols-2">
          {current.map((c, idx) => (
            <article
              key={c.title}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/40 hover:shadow-xl"
            >
              <div>
                <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-royal-100">
                  <SmartImage
                    name={c.image as ImageKey}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(min-width:768px) 50vw, 100vw"
                  />
                </div>
                <div className="p-7 sm:p-8">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-royal text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon name={c.icon} />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-navy group-hover:text-royal transition-colors">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-base text-navy/80 leading-relaxed text-pretty">
                    {c.text}
                  </p>
                </div>
              </div>

              <div className="px-7 pb-7 sm:px-8 sm:pb-8 pt-0">
                <Link
                  href={idx === 0 ? "/products" : "/businesses"}
                  className="inline-flex items-center gap-2 text-sm font-bold text-royal transition-colors hover:text-navy"
                >
                  <span>{idx === 0 ? "Browse products catalog" : "View service details"}</span>
                  <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          ))}
        </Reveal>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-navy/10 bg-white/80 p-4 text-sm text-navy/80">
          <Info size={18} className="text-royal shrink-0 mt-0.5" aria-hidden />
          <p>
            Mobile money services are offered as an agency. Available transaction types will be confirmed here by the company.
          </p>
        </div>
      </section>

      {/* 3. Strategic Roadmap: Where we are heading */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold/15 px-3.5 py-1 text-xs font-bold text-gold-600 uppercase tracking-wider">
            <Hourglass size={14} aria-hidden />
            <span>Planned, not yet operational</span>
          </div>

          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy">
            Where we are heading
          </h2>
          <p className="mt-3 max-w-3xl text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
            {site.vision}
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li
                key={f.title}
                className="group overflow-hidden rounded-xl border border-navy/10 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
              >
                <div className="relative h-32 w-full overflow-hidden bg-royal-100/50">
                  <SmartImage
                    name={f.image as ImageKey}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
                    sizes="(min-width:1024px) 33vw, 100vw"
                  />
                </div>
                <span className="flex items-center gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600 transition-colors group-hover:bg-gold group-hover:text-navy">
                    <Icon name={f.icon} />
                  </span>
                  <span className="text-sm font-bold text-navy group-hover:text-royal transition-colors">
                    {f.title}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Foundational Principles: What guides us */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
          What guides us
        </h2>
        <p className="mt-3 max-w-2xl text-base sm:text-lg text-navy/80 text-pretty">
          {site.mission}
        </p>

        <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="group flex flex-col justify-between rounded-2xl border border-navy/10 bg-white p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg"
            >
              <div>
                <div className="h-1 w-10 rounded-full bg-gold transition-all duration-300 group-hover:w-16 group-hover:bg-royal" />
                <dt className="mt-5 font-display text-2xl font-bold tracking-tight text-royal group-hover:text-navy transition-colors">
                  {v.title}
                </dt>
                <dd className="mt-3 text-sm text-navy/80 leading-relaxed text-pretty">
                  {v.text}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {/* Integrated philosophy quote banner without side-stripe AI tell */}
        <div className="mt-10 rounded-2xl border border-navy/10 bg-white p-7 sm:p-9 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-serif font-bold text-gold leading-none" aria-hidden>&ldquo;</span>
            <span className="text-xs font-bold uppercase tracking-wider text-royal">
              The NOBYST Operating Philosophy
            </span>
          </div>
          <p className="font-display text-lg sm:text-xl font-semibold text-navy leading-relaxed text-pretty">
            {site.philosophy}
          </p>
        </div>
      </section>

      {/* 5. Enterprise Collaboration CTA */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-royal via-royal-700 to-navy p-8 sm:p-12 lg:p-14 text-white shadow-xl">
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                Supplier, distributor or collaborator?
              </h2>
              <p className="mt-3 text-base sm:text-lg text-white/85 text-pretty leading-relaxed">
                Tell us what you offer and how we could work together.
              </p>
            </div>

            <Link
              href="/partnerships"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-8 py-4 font-bold text-navy shadow-md transition-all duration-200 hover:bg-white hover:shadow-xl active:scale-[0.98]"
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
