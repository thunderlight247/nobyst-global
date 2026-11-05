import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact NOBYST GLOBAL LTD in Techiman, Ghana by phone, WhatsApp or email.",
};

export default function Contact() {
  const items = [
    {
      Icon: MessageCircle,
      label: "WhatsApp Support",
      detail: "Fastest response for product checks & orders",
      value: site.phone,
      href: `https://wa.me/${site.whatsapp}`,
      actionText: "Chat on WhatsApp",
      highlight: true,
    },
    {
      Icon: Phone,
      label: "Direct Telephone",
      detail: "Available during commercial business hours",
      value: site.phone,
      href: `tel:${site.phone.replace(/\s/g, "")}`,
      actionText: "Call now",
      highlight: false,
    },
    {
      Icon: Mail,
      label: "Official Email",
      detail: "For formal enquiries & business documentation",
      value: site.email,
      href: `mailto:${site.email}`,
      actionText: "Send email",
      highlight: false,
    },
    {
      Icon: MapPin,
      label: "Commercial Base",
      detail: "Bono East Regional commercial hub",
      value: site.location,
      href: undefined,
      actionText: undefined,
      highlight: false,
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-block rounded-full bg-royal-100 px-3.5 py-1 text-xs font-bold text-royal uppercase tracking-wider">
          Get in Touch
        </span>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy">
          Contact us
        </h1>
        <p className="mt-4 text-base sm:text-lg text-navy/80 leading-relaxed text-pretty">
          Have an enquiry about phone accessories, mobile money agency operations, or a business partnership? Reach out directly to our team.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        {items.map(({ Icon, label, detail, value, href, actionText, highlight }) => (
          <li
            key={label}
            className={`group relative flex flex-col justify-between rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              highlight
                ? "border-gold/50 bg-gradient-to-br from-[#FAF8F0] via-white to-white hover:border-gold"
                : "border-navy/10 bg-white hover:border-royal/30"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                    highlight ? "bg-[#1FA855] text-white" : "bg-royal text-white"
                  }`}
                >
                  <Icon size={22} aria-hidden />
                </span>
                {href && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-navy/60 group-hover:bg-royal-100 group-hover:text-royal transition-colors">
                    <ArrowUpRight size={16} aria-hidden />
                  </span>
                )}
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-navy/70">
                {label}
              </p>
              <p className="mt-1 font-display text-xl font-bold text-navy">
                {value}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-navy/75 leading-relaxed">
                {detail}
              </p>
            </div>

            {href && (
              <div className="mt-6 pt-4 border-t border-navy/5">
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:text-navy transition-colors"
                >
                  <span>{actionText}</span>
                  <span aria-hidden>&rarr;</span>
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
