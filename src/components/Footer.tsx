import Image from "next/image";
import Link from "next/link";
import { site, nav } from "@/data/site";

export default function Footer() {
  return (
    <footer className="mt-24 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="inline-block rounded-lg bg-white p-2"><Image src="/logo.jpg" alt="NOBYST GLOBAL LTD logo" width={96} height={64} className="h-14 w-auto" /></div>
          <p className="mt-4 max-w-xs text-sm text-white/70">{site.tagline}. {site.location}.</p>
        </div>
        <nav aria-label="Footer"><ul className="space-y-2 text-sm">{nav.map((n) => <li key={n.href}><Link className="hover:text-gold" href={n.href}>{n.label}</Link></li>)}</ul></nav>
        <address className="space-y-2 text-sm not-italic">
          <a className="block hover:text-gold" href={`mailto:${site.email}`}>{site.email}</a>
          <a className="block hover:text-gold" href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
          <a className="block hover:text-gold" href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>
          <p className="text-white/70">{site.location}</p>
        </address>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-white/50">© {new Date().getFullYear()} {site.name}. Product entries are illustrative.</p>
    </footer>
  );
}
