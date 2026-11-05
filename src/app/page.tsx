import Link from "next/link";
import { ArrowRight, Hourglass } from "lucide-react";
import HeroRing from "@/components/HeroRing";
import SmartImage from "@/components/SmartImage";
import type { ImageKey } from "@/data/images";
import Reveal from "@/components/Reveal";
import { Icon } from "@/lib/icons";
import { site, current, future, values } from "@/data/site";

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <HeroRing />
        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="mb-5 text-sm font-semibold text-gold">{site.name}, {site.location}</p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] sm:text-7xl">Building trust.<br />Delivering solutions.<br />Growing together.</h1>
          <p className="mt-7 max-w-xl text-lg text-white/80">{site.intro}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-bold text-navy hover:bg-white">Browse products <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/about" className="rounded-full border border-white/40 px-6 py-3 font-bold hover:bg-white/10">About us</Link>
            <Link href="/partnerships" className="rounded-full border border-white/40 px-6 py-3 font-bold hover:bg-white/10">Partner with us</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-24">
        <h2 className="font-display text-4xl font-bold">What we do today</h2>
        <Reveal className="mt-8 grid gap-6 md:grid-cols-2">
          {current.map((c) => (
            <article key={c.title} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy/10">
              <SmartImage name={c.image as ImageKey} className="h-48 w-full" sizes="(min-width:768px) 50vw, 100vw" />
              <div className="p-8"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-royal text-white"><Icon name={c.icon} /></span>
              <h3 className="mt-5 font-display text-2xl font-bold">{c.title}</h3>
              <p className="mt-2 text-navy/75">{c.text}</p></div>
            </article>
          ))}
        </Reveal>
        <p className="mt-4 text-sm text-navy/60">Mobile money services are offered as an agency. Available transaction types will be confirmed here by the company.</p>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-5">
        <div className="rounded-3xl border-2 border-dashed border-gold bg-gold-100/50 p-8 sm:p-12">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-gold-600"><Hourglass size={16} aria-hidden /> Planned, not yet operational</p>
          <h2 className="mt-3 font-display text-4xl font-bold">Where we are heading</h2>
          <p className="mt-3 max-w-2xl text-navy/75">{site.vision}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li key={f.title} className="overflow-hidden rounded-xl bg-white/80 font-semibold"><SmartImage name={f.image as ImageKey} className="h-28 w-full" sizes="(min-width:1024px) 33vw, 100vw" /><span className="flex items-center gap-3 p-4"><Icon name={f.icon} className="text-gold-600" /> {f.title}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-5">
        <h2 className="font-display text-4xl font-bold">What guides us</h2>
        <p className="mt-3 max-w-2xl text-navy/75">{site.mission}</p>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="border-t-4 border-gold pt-4">
              <dt className="font-display text-2xl font-bold text-royal">{v.title}</dt>
              <dd className="mt-1 text-sm text-navy/75">{v.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 max-w-2xl text-navy/75">{site.philosophy}</p>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-royal p-10 text-white sm:flex-row sm:items-center">
          <div><h2 className="font-display text-3xl font-bold">Supplier, distributor or collaborator?</h2><p className="mt-2 text-white/80">Tell us what you offer and how we could work together.</p></div>
          <Link href="/partnerships" className="rounded-full bg-gold px-6 py-3 font-bold text-navy hover:bg-white">Send a partnership enquiry</Link>
        </div>
      </section>
    </>
  );
}
