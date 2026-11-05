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
    const f = () => { const h = document.documentElement; setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)); };
    window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="NOBYST GLOBAL LTD home"><Image src="/logo.jpg" alt="NOBYST GLOBAL LTD logo" width={96} height={64} className="h-12 w-auto" priority /></Link>
        <nav aria-label="Main" className="hidden gap-8 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}
              className={`py-1 text-sm font-semibold ${path === n.href ? "border-b-2 border-gold text-navy" : "text-navy/70 hover:text-royal"}`}>{n.label}</Link>
          ))}
        </nav>
        <button className="rounded p-2 md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-navy/10 bg-white px-5 pb-4 md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} className="block border-b border-navy/5 py-4 text-lg font-semibold">{n.label}</Link>)}
        </nav>
      )}
      <div className="h-0.5 origin-left bg-gold" style={{ transform: `scaleX(${progress})` }} aria-hidden />
    </header>
  );
}
