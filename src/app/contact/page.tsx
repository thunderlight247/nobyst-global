import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin, ArrowUpRight } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { whatsappLink } from "@/lib/contact-links";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact NOBYST GLOBAL LTD in Techiman, Ghana by phone, WhatsApp or email.",
};

export default function Contact() {
  const items = [
    {
      Icon: MessageCircle,
      label: "WhatsApp support",
      detail: "Fastest route for product checks, agency services and orders",
      value: site.phone,
      href: whatsappLink(`Hello ${site.short}, I would like to make an enquiry.`),
      actionText: "Chat on WhatsApp",
      highlight: true,
    },
    {
      Icon: Phone,
      label: "Telephone",
      detail: "Call during commercial business hours",
      value: site.phone,
      href: `tel:${site.phone.replace(/[^\d+]/g, "")}`,
      actionText: "Call now",
      highlight: false,
    },
    {
      Icon: Mail,
      label: "Email",
      detail: "For formal enquiries and business documentation",
      value: site.email,
      href: `mailto:${site.email}`,
      actionText: "Send email",
      highlight: false,
    },
    {
      Icon: MapPin,
      label: "Commercial base",
      detail: "Bono East Region, Ghana",
      value: site.location,
      href: undefined,
      actionText: undefined,
      highlight: false,
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
          Get in touch
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
          Contact us
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-navy/75 text-pretty sm:text-lg">
          Questions about accessories, mobile money agency services or a business partnership? Reach
          our team directly.
        </p>
      </div>

      <ul className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
        {items.map(({ Icon, label, detail, value, href, actionText, highlight }) => (
          <li
            key={label}
            className={`group relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${
              highlight
                ? "border-gold/50 bg-gradient-to-br from-[#FAF8F0] via-white to-white hover:border-gold"
                : "border-navy/10 bg-white hover:border-royal/30"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                    highlight ? "bg-[#1FA855] text-white" : "bg-royal text-white"
                  }`}
                >
                  <Icon size={21} aria-hidden />
                </span>
                {href && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-navy/60 transition-colors group-hover:bg-royal-100 group-hover:text-royal">
                    <ArrowUpRight size={16} aria-hidden />
                  </span>
                )}
              </div>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-navy/65">
                {label}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-navy sm:text-xl">{value}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-navy/70 sm:text-sm">{detail}</p>
            </div>

            {href && (
              <div className="mt-5 border-t border-navy/5 pt-3.5">
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-royal transition-colors hover:text-navy"
                >
                  <span>{actionText}</span>
                  <span aria-hidden>&rarr;</span>
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Message form — the contact details above stay the single source */}
      <div className="mt-8 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:mt-10 sm:p-10">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-royal sm:text-xs">
            Message us
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
            Send an enquiry
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-navy/70">
            Share a few details and we will continue the conversation on WhatsApp or email.
          </p>
        </div>
        <div className="mt-6 sm:mt-7">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
