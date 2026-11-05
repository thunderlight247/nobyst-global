"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav } from "@/data/site";

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 backdrop-blur-md transition-shadow">
      <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NOBYST GLOBAL LTD home"
          className="flex items-center gap-3 focus-visible:outline-royal"
        >
          <Image
            src="/logo.jpg"
            alt="NOBYST GLOBAL LTD logo"
            width={96}
            height={64}
            className="h-11 sm:h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main" className="hidden gap-8 md:flex items-center">
          {nav.map((n) => {
            const isActive = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? "text-navy"
                    : "text-navy/75 hover:text-royal"
                }`}
              >
                {n.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-1 h-0.5 bg-gold rounded-full"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu toggle with WCAG 44px touch target */}
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

      {/* Mobile Navigation Drawer */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-navy/10 bg-white px-5 py-4 md:hidden shadow-lg"
        >
          {nav.map((n) => {
            const isActive = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`block border-b border-navy/5 py-3.5 text-base font-bold transition-colors ${
                  isActive ? "text-royal" : "text-navy/85 hover:text-royal"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Reading Progress Indicator */}
      <div
        className="h-0.5 origin-left bg-gold transition-transform duration-75"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />
    </header>
  );
}
