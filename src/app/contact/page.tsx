import type { Metadata } from "next";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { site } from "@/data/site";
export const metadata: Metadata = { title: "Contact", description: "Contact NOBYST GLOBAL LTD in Techiman, Ghana by phone, WhatsApp or email." };
export default function Contact() {
  const items = [
    { Icon: Phone, label: "Telephone", value: site.phone, href: `tel:${site.phone.replace(/\s/g, "")}` },
    { Icon: MessageCircle, label: "WhatsApp", value: site.phone, href: `https://wa.me/${site.whatsapp}` },
    { Icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    { Icon: MapPin, label: "Location", value: site.location, href: undefined as string | undefined },
  ];
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="font-display text-5xl font-extrabold">Contact us</h1>
      <p className="mt-3 text-navy/75">The quickest way to reach us is WhatsApp.</p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {items.map(({ Icon, label, value, href }) => (
          <li key={label} className="rounded-2xl bg-white p-6 ring-1 ring-navy/10">
            <Icon className="text-royal" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-navy/60">{label}</p>
            {href ? <a href={href} className="text-lg font-bold hover:text-royal">{value}</a> : <p className="text-lg font-bold">{value}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
