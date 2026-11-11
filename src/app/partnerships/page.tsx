import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";
import { Handshake, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Partner with us",
  description:
    "Suppliers, distributors and collaborators: enquire about working with NOBYST GLOBAL LTD in Techiman, Ghana.",
};

export default function Partnerships() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
        <div>
          <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
            Commercial collaborations
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
            Let us work together
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-navy/75 text-pretty sm:text-lg">
            We are open to structured conversations with wholesale suppliers, regional distributors
            and financial partners who share our commitment to dependable trade and long-term
            relationships.
          </p>

          <div className="mt-7 space-y-3.5">
            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-100 text-royal">
                <MapPin size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Techiman trading base</h3>
                <p className="mt-1 text-xs leading-relaxed text-navy/75 sm:text-sm">
                  A commercial position in one of Ghana&apos;s busiest market towns and regional
                  trading corridors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Clear, dependable trading</h3>
                <p className="mt-1 text-xs leading-relaxed text-navy/75 sm:text-sm">
                  Straightforward communication, agreed terms and reliable follow-through.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-100 text-royal">
                <Handshake size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Early expansion partnerships</h3>
                <p className="mt-1 text-xs leading-relaxed text-navy/75 sm:text-sm">
                  Join as a supplier or service partner as planned business areas are developed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:p-9">
          <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
            <CheckCircle2 size={16} aria-hidden />
            <span>Partnership enquiry</span>
          </div>
          <EnquiryForm />
        </div>
      </div>
    </section>
  );
}
