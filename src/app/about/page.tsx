import type { Metadata } from "next";
import SmartImage from "@/components/SmartImage";
import { site, values } from "@/data/site";
export const metadata: Metadata = { title: "About", description: "The story, mission, vision and values of NOBYST GLOBAL LTD, a Ghanaian enterprise based in Techiman." };

export default function About() {
  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl font-extrabold">{site.tagline}</h1>
            <p className="mt-5 text-lg text-white/80">{site.intro}</p>
          </div>
          <SmartImage name="team" className="h-72 rounded-2xl" priority />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-20 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-8 ring-1 ring-navy/10"><h2 className="font-display text-3xl font-bold">Our mission</h2><p className="mt-3 text-navy/75">{site.mission}</p></div>
        <div className="rounded-2xl bg-white p-8 ring-1 ring-navy/10"><h2 className="font-display text-3xl font-bold">Our vision</h2><p className="mt-3 text-navy/75">{site.vision}</p></div>
        <div className="rounded-2xl bg-gold-100/60 p-8 md:col-span-2"><h2 className="font-display text-3xl font-bold">How we work</h2><p className="mt-3 max-w-3xl text-navy/80">{site.philosophy}</p></div>
      </section>
      <section className="mx-auto max-w-6xl px-5">
        <h2 className="font-display text-4xl font-bold">Our values</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="border-t-4 border-gold pt-4"><dt className="font-display text-2xl font-bold text-royal">{v.title}</dt><dd className="mt-1 text-sm text-navy/75">{v.text}</dd></div>
          ))}
        </dl>
        <p className="mt-12 text-sm text-navy/60">Company history, founding year and team details have not been supplied yet. They can be added to this page once confirmed.</p>
      </section>
    </>
  );
}
