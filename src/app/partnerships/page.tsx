import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";
import { Handshake, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Partner with us",
  description: "Suppliers, distributors and collaborators: enquire about working with NOBYST GLOBAL LTD in Techiman, Ghana.",
};

export default function Partnerships() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Left: Value Proposition */}
        <div>
          <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-xs font-bold text-royal uppercase tracking-wider">
            Commercial Collaborations
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy">
            Let us work together
          </h1>
          <p className="mt-5 text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
            We are actively open to structured conversations with wholesale suppliers, regional distributors, and financial partners who share our commitment to dependable trade and long-term relationships.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-100 text-royal mt-0.5">
                <MapPin size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Techiman Distribution Gateway</h3>
                <p className="text-xs sm:text-sm text-navy/80 mt-1">Direct access to one of West Africa&apos;s most active commercial and transit trading markets.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600 mt-0.5">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Trust-First Operating Standards</h3>
                <p className="text-xs sm:text-sm text-navy/80 mt-1">Dependable fulfillment, prompt settlements, and transparent commercial communication.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-100 text-royal mt-0.5">
                <Handshake size={18} aria-hidden />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy">Multisector Expansion Opportunities</h3>
                <p className="text-xs sm:text-sm text-navy/80 mt-1">Join early as a core supplier or logistics partner as we roll out new business verticals.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Enquiry Form Container */}
        <div className="rounded-3xl border border-navy/10 bg-white p-7 sm:p-10 shadow-lg">
          <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-royal">
            <CheckCircle2 size={16} aria-hidden />
            <span>Commercial Enquiry Form</span>
          </div>
          <EnquiryForm />
        </div>
      </div>
    </section>
  );
}
