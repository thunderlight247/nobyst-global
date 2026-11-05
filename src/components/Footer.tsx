import Image from "next/image";
import Link from "next/link";
import { site, nav } from "@/data/site";

export default function Footer() {
  return (
    <footer className="mt-20 sm:mt-28 bg-navy text-white border-t border-navy-700">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:px-8 py-16 md:grid-cols-3">
        <div>
          <div className="inline-block rounded-xl bg-white p-2.5 shadow-sm">
            <Image
              src="/logo.jpg"
              alt="NOBYST GLOBAL LTD logo"
              width={96}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/80 leading-relaxed">
            {site.name} · {site.tagline}. Based in {site.location}.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <p className="text-xs font-bold uppercase tracking-wider text-gold mb-4">
            Navigation
          </p>
          <ul className="space-y-2.5 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  className="text-white/80 transition-colors hover:text-gold"
                  href={n.href}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold mb-4">
            Contact & Location
          </p>
          <address className="space-y-2.5 text-sm not-italic text-white/80">
            <p className="text-white/90 font-medium">{site.location}</p>
            <a
              className="block transition-colors hover:text-gold"
              href={`mailto:${site.email}`}
            >
              {site.email}
            </a>
            <a
              className="block transition-colors hover:text-gold"
              href={`tel:${site.phone.replace(/\s/g, "")}`}
            >
              {site.phone}
            </a>
            <a
              className="inline-flex items-center gap-1.5 font-bold text-gold transition-colors hover:text-white"
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Direct WhatsApp Support →
            </a>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 px-5 text-center text-xs text-white/70">
        <p>
          © {new Date().getFullYear()} {site.name}. All rights reserved. Product and catalog items shown are illustrative.
        </p>
      </div>
    </footer>
  );
}
