"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, Search, X } from "lucide-react";
import { nav, site } from "@/data/site";

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:h-20 sm:px-6 lg:px-8">
        <div className="flex flex-1 justify-start">
        <Link
          href="/"
          aria-label="NOBYST GLOBAL LTD — home"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-royal"
        >
          <Image
            src="/logo-mark.png"
            alt=""
            width={86}
            height={55}
            className="h-10 w-auto sm:h-11"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight text-navy sm:text-xl">
              NOBYST
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-navy/55 sm:text-[10px]">
              Global Ltd
            </span>
          </span>
        </Link>
        </div>

        {/* Desktop navigation, centred */}
        <nav aria-label="Main" className="hidden items-center gap-5 md:flex lg:gap-7">
          {nav.map((n) => {
            const isActive = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative py-2 text-[13px] font-bold transition-colors lg:text-sm ${
                  isActive ? "text-navy" : "text-navy/70 hover:text-royal"
                }`}
              >
                {n.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gold" aria-hidden />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
        <Link
          href="/products"
          className="hidden h-10 w-56 items-center gap-2 rounded-full border border-neutral-200/60 bg-neutral-50 px-4 text-sm text-navy/60 transition-colors hover:border-royal/40 hover:text-navy md:inline-flex lg:w-64"
        >
          <Search size={16} aria-hidden />
          <span>Search accessories</span>
        </Link>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl text-navy transition-colors hover:bg-navy/5 active:scale-95 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-navy/10 bg-white px-5 py-3 shadow-xl md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="mb-3 pt-1">
            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="flex h-11 w-full items-center gap-2.5 rounded-full border border-neutral-200/80 bg-neutral-50 px-4 text-sm font-medium text-navy/70 transition-colors hover:border-royal/40 hover:text-navy"
            >
              <Search size={16} aria-hidden className="text-navy/50" />
              <span>Search products &amp; accessories</span>
            </Link>
          </div>

          <div className="divide-y divide-navy/5">
            {nav.map((n) => {
              const isActive = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[44px] items-center py-3 text-base font-bold transition-colors ${
                    isActive ? "text-royal" : "text-navy/85 hover:text-royal"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 border-t border-navy/10 pt-3 pb-1">
            <a
              href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello NOBYST, I would like to make an enquiry.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1ebd5a] active:scale-[0.98]"
            >
              <MessageCircle size={17} aria-hidden />
              <span>Chat on WhatsApp ({site.phone})</span>
            </a>
          </div>
        </nav>
      )}

      <div
        className="h-0.5 origin-left bg-gold transition-transform duration-75"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />
    </header>
  );
}
