import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles, Target } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { companyFacts, site, values } from "@/data/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story, mission, vision and values of NOBYST GLOBAL LTD, a Ghanaian enterprise based in Techiman.",
};

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy py-12 text-white sm:py-20 lg:py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(100%_80%_at_100%_0%,#20349B_0%,transparent_60%)] opacity-70"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
          <div>
            <span className="inline-block rounded-full bg-gold/15 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold sm:text-xs">
              About NOBYST
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
              {site.tagline}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/80 text-pretty sm:text-lg">
              {site.intro}
            </p>
            <Link
              href="/businesses"
              className="group mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy shadow-md transition-all duration-200 hover:bg-white hover:shadow-xl active:scale-[0.98] sm:text-base"
            >
              See our businesses
              <ArrowRight
                size={18}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
          <div className="group overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <SmartImage
              name="team"
              className="h-60 w-full sm:h-72 lg:h-80"
              imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
              priority
            />
          </div>
        </div>
      </section>

      {/* Company at a glance */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {companyFacts.map((f) => (
            <div key={f.label} className="bg-white p-5 sm:p-6">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-navy/55">
                {f.label}
              </dt>
              <dd className="mt-1.5 text-sm font-semibold leading-relaxed text-navy">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Mission & vision */}
      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-6 sm:pb-16 lg:px-8">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <div className="group rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg sm:p-9">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-royal-100 text-royal transition-transform duration-300 group-hover:scale-110">
              <Target size={22} aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-navy sm:text-3xl">Our mission</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy/75 text-pretty sm:text-base">
              {site.mission}
            </p>
          </div>

          <div className="group rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg sm:p-9">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-600 transition-transform duration-300 group-hover:scale-110">
              <Compass size={22} aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-navy sm:text-3xl">Our vision</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy/75 text-pretty sm:text-base">
              {site.vision}
            </p>
          </div>

          <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-6 shadow-sm sm:p-9 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-royal">
              <Sparkles size={14} aria-hidden />
              <span>Operating philosophy</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">How we work</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy/80 text-pretty sm:text-lg">
              {site.philosophy}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6 sm:pb-24 lg:px-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-4xl">
          Our core values
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="group rounded-2xl border border-navy/10 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg sm:p-6"
            >
              <div className="h-1 w-9 rounded-full bg-gold transition-all duration-300 group-hover:w-14 group-hover:bg-royal" />
              <dt className="mt-4 font-display text-xl font-bold text-royal transition-colors group-hover:text-navy sm:text-2xl">
                {v.title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-navy/75">{v.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
