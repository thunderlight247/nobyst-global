"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { nav } from "@/data/site";

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
          className="border-t border-navy/10 bg-white px-5 py-2 shadow-lg md:hidden"
        >
          {nav.map((n) => {
            const isActive = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`block border-b border-navy/5 py-3.5 text-base font-bold transition-colors last:border-0 ${
                  isActive ? "text-royal" : "text-navy/85 hover:text-royal"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
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
