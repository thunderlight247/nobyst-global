import type { Metadata } from "next";
import Link from "next/link";
import { Hourglass, CheckCircle2 } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { Icon } from "@/lib/icons";
import { current, future } from "@/data/site";
import type { ImageKey } from "@/data/images";
export const metadata: Metadata = { title: "Our Businesses", description: "What NOBYST GLOBAL LTD does today, and the business areas it plans to grow into." };

// Placeholder wording only; replace with confirmed services.
const momoPoints = ["Agency services for everyday money needs", "Served from Techiman, Ghana", "Transaction types and partner institutions: to be confirmed by the company"];

export default function Businesses() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-5xl font-extrabold">Our businesses</h1>
        <p className="mt-3 max-w-2xl text-navy/75">What we run today, and where we plan to grow.</p>
        <h2 className="mt-14 inline-flex items-center gap-2 font-display text-3xl font-bold"><CheckCircle2 className="text-royal" aria-hidden /> Operating today</h2>
        <div className="mt-8 space-y-8">
          {current.map((c, i) => (
            <article key={c.title} className="grid overflow-hidden rounded-2xl bg-white ring-1 ring-navy/10 md:grid-cols-2">
              <SmartImage name={c.image as ImageKey} className={`h-64 md:h-full ${i % 2 ? "md:order-2" : ""}`} />
              <div className="p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-royal text-white"><Icon name={c.icon} /></span>
                <h3 className="mt-4 font-display text-2xl font-bold">{c.title}</h3>
                <p className="mt-2 text-navy/75">{c.text}</p>
                {i === 1 && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-navy/70">{momoPoints.map((m) => <li key={m}>{m}</li>)}</ul>}
                <Link href={i === 0 ? "/products" : "/contact"} className="mt-5 inline-block font-bold text-royal hover:underline">{i === 0 ? "Browse products" : "Ask about this service"}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5">
        <div className="rounded-3xl border-2 border-dashed border-gold bg-gold-100/50 p-8 sm:p-12">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-gold-600"><Hourglass size={16} aria-hidden /> Planned, not yet operational</p>
          <h2 className="mt-3 font-display text-4xl font-bold">Future growth areas</h2>
          <p className="mt-3 max-w-2xl text-navy/75">These are strategic ambitions, not current services.</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {future.map((f) => (
              <li key={f.title} className="overflow-hidden rounded-xl bg-white font-semibold"><SmartImage name={f.image as ImageKey} className="h-36 w-full" sizes="(min-width:1024px) 33vw, 100vw" /><span className="flex items-center gap-3 p-4"><Icon name={f.icon} className="text-gold-600" /> {f.title}</span></li>
            ))}
          </ul>
          <Link href="/partnerships" className="mt-8 inline-block rounded-full bg-navy px-6 py-3 font-bold text-white hover:bg-royal">Explore a partnership</Link>
        </div>
      </section>
    </>
  );
}
