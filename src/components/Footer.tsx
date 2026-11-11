import Image from "next/image";
import Link from "next/link";
import { site, nav } from "@/data/site";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-navy-700 bg-navy text-white sm:mt-24">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:gap-10 sm:px-6 sm:py-16 md:grid-cols-3 lg:px-8">
        <div>
          <Link
            href="/"
            aria-label="NOBYST GLOBAL LTD — home"
            className="inline-flex items-center gap-3 rounded-md"
          >
            <Image
              src="/logo-mark-light.png"
              alt=""
              width={86}
              height={55}
              className="h-11 w-auto"
            />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight">NOBYST</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-gold">
                Global Ltd
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
            {site.positioning}
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Navigation</p>
          <ul className="space-y-2.5 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link className="text-white/75 transition-colors hover:text-gold" href={n.href}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Contact & location</p>
          <address className="space-y-2.5 text-sm not-italic text-white/75">
            <p className="font-medium text-white/90">{site.region}</p>
            <a className="block transition-colors hover:text-gold" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            <a
              className="block transition-colors hover:text-gold"
              href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
            >
              {site.phone}
            </a>
            <a
              className="inline-flex items-center gap-1.5 font-bold text-gold transition-colors hover:text-white"
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Direct WhatsApp support →
            </a>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/60">
        <p>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
