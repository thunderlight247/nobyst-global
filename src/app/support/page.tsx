import type { Metadata } from "next";
import { Mail, MessageCircle, Clock } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { site } from "@/data/site";
import { mailtoLink, whatsappLink } from "@/lib/contact-links";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Send your questions or concerns to NOBYST GLOBAL LTD by WhatsApp or email, or through the support form.",
};

export default async function Support({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const productName = product?.trim().slice(0, 120) ?? "";
  const defaultMessage = productName ? `I have a question about: ${productName}.\n\n` : "";

  const whatsappMessage = productName
    ? `Hello ${site.short}, I have a question about: ${productName}.`
    : `Hello ${site.short}, I have a question or concern.`;

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
          Customer support
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
          How can we help?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-navy/75 text-pretty sm:text-lg">
          Send us your questions or concerns about products, orders or payments. Choose WhatsApp for the
          fastest reply, or email us directly.
        </p>
      </div>

      <ul className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
        <li className="flex flex-col justify-between rounded-2xl border border-gold/50 bg-gradient-to-br from-[#FAF8F0] via-white to-white p-6 shadow-sm sm:p-7">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1FA855] text-white shadow-sm">
              <MessageCircle size={21} aria-hidden />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-navy/65">WhatsApp</p>
            <p className="mt-1 font-display text-lg font-bold text-navy sm:text-xl">{site.phone}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-navy/70 sm:text-sm">
              Fastest route for product checks, orders and follow-up.
            </p>
          </div>
          <div className="mt-5 border-t border-navy/5 pt-3.5">
            <a
              href={whatsappLink(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-royal transition-colors hover:text-navy"
            >
              <span>Message us on WhatsApp</span>
              <span aria-hidden>&rarr;</span>
            </a>
          </div>
        </li>

        <li className="flex flex-col justify-between rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-7">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal text-white shadow-sm">
              <Mail size={21} aria-hidden />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-navy/65">Email</p>
            <p className="mt-1 font-display text-lg font-bold text-navy sm:text-xl">{site.email}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-navy/70 sm:text-sm">
              For formal concerns, documents and detailed questions.
            </p>
          </div>
          <div className="mt-5 border-t border-navy/5 pt-3.5">
            <a
              href={mailtoLink("Support enquiry", defaultMessage || "Hello NOBYST, I have a question.")}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-royal transition-colors hover:text-navy"
            >
              <span>Send us an email</span>
              <span aria-hidden>&rarr;</span>
            </a>
          </div>
        </li>
      </ul>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-navy/60">
        <Clock size={14} aria-hidden />
        Replies are sent during business hours, Monday to Saturday.
      </p>

      <div className="mt-8 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:mt-10 sm:p-10">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
            Send a message
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
            Questions or concerns
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-navy/70">
            Your message is saved to our team, and we reply to the email address you give.
          </p>
        </div>
        <div className="mt-6 sm:mt-7">
          <ContactForm defaultMessage={defaultMessage} />
        </div>
      </div>
    </section>
  );
}
