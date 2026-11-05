import type { Metadata } from "next";
import SmartImage from "@/components/SmartImage";
import { site, values } from "@/data/site";
import { Info, Target, Compass, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "The story, mission, vision and values of NOBYST GLOBAL LTD, a Ghanaian enterprise based in Techiman.",
};

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy text-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 lg:px-8 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-gold/15 px-3.5 py-1 text-xs font-bold text-gold uppercase tracking-wider">
              About NOBYST
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              {site.tagline}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed text-pretty">
              {site.intro}
            </p>
          </div>
          <div className="group overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <SmartImage
              name="team"
              className="h-72 sm:h-80 w-full"
              imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
              priority
            />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="group rounded-2xl border border-navy/10 bg-white p-7 sm:p-9 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-royal-100 text-royal transition-transform duration-300 group-hover:scale-110">
              <Target size={22} aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl sm:text-3xl font-bold text-navy">Our mission</h2>
            <p className="mt-3 text-base text-navy/80 leading-relaxed text-pretty">{site.mission}</p>
          </div>

          <div className="group rounded-2xl border border-navy/10 bg-white p-7 sm:p-9 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-600 transition-transform duration-300 group-hover:scale-110">
              <Compass size={22} aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl sm:text-3xl font-bold text-navy">Our vision</h2>
            <p className="mt-3 text-base text-navy/80 leading-relaxed text-pretty">{site.vision}</p>
          </div>

          <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-[#FAF8F0] via-white to-[#F2F5FD] p-7 sm:p-9 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-royal">
              <Sparkles size={14} aria-hidden />
              <span>Operational Philosophy</span>
            </div>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-navy">How we work</h2>
            <p className="mt-3 max-w-3xl text-base sm:text-lg text-navy/85 leading-relaxed text-pretty">{site.philosophy}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy">Our core values</h2>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="group rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal/30 hover:shadow-lg"
            >
              <div className="h-1 w-10 rounded-full bg-gold transition-all duration-300 group-hover:w-16 group-hover:bg-royal" />
              <dt className="mt-5 font-display text-2xl font-bold text-royal group-hover:text-navy transition-colors">{v.title}</dt>
              <dd className="mt-2 text-sm text-navy/80 leading-relaxed">{v.text}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex items-center gap-3 rounded-xl border border-navy/10 bg-white p-4 text-xs sm:text-sm text-navy/80">
          <Info size={16} className="text-royal shrink-0" aria-hidden />
          <p>
            Company history, founding milestones, and executive leadership profiles will be updated as our governance structures formalize.
          </p>
        </div>
      </section>
    </>
  );
}
