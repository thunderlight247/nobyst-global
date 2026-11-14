"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Inbox, Menu, MessageCircle, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useNobystStore } from "@/store/useStore";
import { nav, site } from "@/data/site";

function CartLink() {
  const cart = useNobystStore((s) => s.cart);
  // Read the persisted cart only after mount, so server and client markup match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? cart.reduce((sum, c) => sum + c.quantity, 0) : 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative inline-flex h-10 items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 text-xs font-bold text-navy shadow-sm transition-colors hover:border-royal hover:text-royal"
    >
      <ShoppingBag size={15} aria-hidden />
      <span>Cart</span>
      {count > 0 && (
        <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-royal px-1.5 text-[10px] font-extrabold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/90 backdrop-blur-md shadow-sm transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-20 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex shrink-0 items-center">
          <Link
            href="/"
            aria-label="NOBYST GLOBAL LTD — home"
            className="group flex items-center gap-3 rounded-lg focus-visible:outline-royal"
          >
            <div className="relative overflow-hidden rounded-xl bg-navy/5 p-1 transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/logo-mark.png"
                alt=""
                width={86}
                height={55}
                className="h-9 w-auto sm:h-10"
                priority
              />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight text-navy sm:text-xl">
                NOBYST
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-navy/60 sm:text-[10px]">
                Global Ltd
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation with Active Highlighting */}
        <nav aria-label="Main Navigation" className="hidden items-center gap-1 md:flex lg:gap-2">
          {nav.map((n) => {
            const isActive = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-1.5 text-xs font-bold transition-all lg:text-sm ${
                  isActive
                    ? "bg-navy text-white shadow-sm"
                    : "text-navy/75 hover:bg-navy/5 hover:text-navy"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search Input, Inquiries Shortcut, and Mobile Menu */}
        <div className="flex items-center justify-end gap-2.5">
          <Link
            href="/products"
            className="hidden h-10 w-48 items-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-100/70 px-3.5 text-xs text-navy/65 transition-all hover:border-royal/50 hover:bg-white hover:text-navy focus:outline-none focus:ring-2 focus:ring-royal/20 md:inline-flex lg:w-56"
          >
            <Search size={15} aria-hidden className="text-navy/50" />
            <span className="truncate">Search accessories…</span>
          </Link>

          {/* Cart link with live item count */}
          <CartLink />

          <Link
            href="/account"
            className="hidden h-10 items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 text-xs font-bold text-navy shadow-sm transition-colors hover:border-royal hover:text-royal md:inline-flex"
          >
            <UserRound size={15} aria-hidden />
            <span>Account</span>
          </Link>

          {/* Quick inquiries / admin link */}
          <Link
            href="/admin/enquiries"
            className="hidden h-10 items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 text-xs font-bold text-navy shadow-sm transition-colors hover:border-royal hover:text-royal lg:inline-flex"
            title="Customer enquiries inbox"
          >
            <Inbox size={15} aria-hidden />
            <span>Enquiries</span>
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy/10 bg-white text-navy transition-colors hover:bg-navy/5 active:scale-95 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile Navigation"
          className="border-t border-navy/10 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur-xl md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="mb-3">
            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="flex h-11 w-full items-center gap-2.5 rounded-full border border-neutral-200/80 bg-neutral-50 px-4 text-xs font-medium text-navy/70 transition-colors hover:border-royal/40 hover:text-navy"
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
                  onClick={() => setOpen(false)}
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

          <div className="mt-4 border-t border-navy/10 pt-3">
            <a
              href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                "Hello NOBYST, I would like to make an enquiry."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 active:scale-[0.98]"
            >
              <MessageCircle size={18} aria-hidden />
              <span>Chat on WhatsApp ({site.phone})</span>
            </a>
          </div>
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
