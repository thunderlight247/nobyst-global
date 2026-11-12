"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { site, current } from "@/data/site";
import { whatsappLink } from "@/lib/contact-links";

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  badge: string;
  caption: string;
}

// 5 curated flagship device & accessory visuals from existing assets
const HERO_SLIDES: HeroSlide[] = [
  {
    id: "smartphones",
    image: "/images/phone-detail.jpg",
    alt: "Flagship smartphones front and back inspection",
    badge: "Phones & Devices",
    caption: "Latest smartphones and verified devices in Techiman",
  },
  {
    id: "cables",
    image: "/images/accessories.jpg",
    alt: "Multi-tip fast charging cable set and adapters",
    badge: "Universal Cables",
    caption: "Heavy-duty 5-in-1 fast charging & data sync",
  },
  {
    id: "chargers",
    image: "/images/products/65w-fast-charger.jpg",
    alt: "65W Fast dual-port wall charger adapter",
    badge: "GaN Fast Power",
    caption: "Overheat-protected rapid charging wall plugs",
  },
  {
    id: "audio",
    image: "/images/products/over-ear-wireless-headphones.jpg",
    alt: "Wireless over-ear noise isolating headphones",
    badge: "Audio & Acoustics",
    caption: "Long-lasting battery with deep bass & clear calls",
  },
  {
    id: "payments",
    image: "/images/payments.jpg",
    alt: "Techiman mobile money and cash services counter",
    badge: "Mobile Money Agency",
    caption: "Reliable everyday cash and electronic transfers",
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = HERO_SLIDES.length;

  // Auto-change slide every 4.5 seconds (paused on hover or user interaction)
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        nextSlide(); // swipe left -> next
      } else {
        prevSlide(); // swipe right -> prev
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeSlideData = HERO_SLIDES[currentSlide];

  return (
    <section
      aria-label="Hero Showcase"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative isolate overflow-hidden bg-navy text-white min-h-[580px] sm:min-h-[680px] lg:min-h-[740px]"
    >
      {/* BACKGROUND CHANGING PHONE & DEVICE SLIDESHOW */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <div
                className={`relative h-full w-full transition-transform duration-[6000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover object-center sm:object-right"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* READABILITY & CONTRAST GRADIENT OVERLAYS (Mobile-optimized) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/95 via-slate-950/85 to-navy/95 sm:bg-gradient-to-r sm:from-slate-950/95 sm:via-slate-950/80 sm:to-slate-950/45"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-royal-900/35 via-transparent to-navy/70"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-navy to-transparent"
      />

      {/* MAIN HERO CONTENT */}
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        {/* MOBILE SLIDE INDICATOR CHIP (VISIBLE ON SMALL SCREENS) */}
        <div className="mb-4 flex items-center justify-between gap-2 sm:hidden">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-gold backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            <span className="truncate max-w-[190px]">{activeSlideData.badge}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-1 text-[10px] font-bold text-white/70">
              0{currentSlide + 1}/0{totalSlides}
            </span>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Brand Copy & CTAs */}
          <div className="lg:col-span-7 lg:pr-6">
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold sm:text-xs">
                <span>{site.name}</span>
                <span className="mx-2 text-gold/40">•</span>
                <span className="text-white/80">{site.location}</span>
              </p>
            </div>

            <h1 className="font-display text-[1.85rem] leading-[1.12] font-extrabold tracking-tight text-balance sm:mt-5 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
              Building trust.
              <br />
              Delivering solutions.
              <br />
              <span className="text-gold">Growing together.</span>
            </h1>

            <div aria-hidden className="mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-gold to-amber-500 sm:mt-6 sm:w-16" />

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 text-pretty sm:mt-5 sm:text-lg">
              {site.intro}
            </p>

            {/* CTAs (Full-width on mobile with clear touch boundaries) */}
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <a
                href={whatsappLink(`Hello ${site.short}, I would like to make an enquiry.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-xl active:scale-[0.98] sm:w-auto sm:text-base"
              >
                <MessageCircle size={18} aria-hidden />
                <span>Chat with us on WhatsApp</span>
              </a>

              <Link
                href="/businesses"
                className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:border-white hover:bg-white/20 active:scale-[0.98] sm:w-auto sm:text-base"
              >
                <span>Explore our businesses</span>
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>

              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                <Link
                  href="/about"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98] sm:flex-none sm:text-sm"
                >
                  About the company
                </Link>

                <Link
                  href="/partnerships"
                  className="group inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-xs font-bold text-white/80 transition-colors hover:text-gold sm:text-sm"
                >
                  <span>Partner with us</span>
                  <ArrowRight
                    size={15}
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Phone Device Showcase Card */}
          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-7">
              {/* Active Slide Feature Card */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                <div>
                  <span className="inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {activeSlideData.badge}
                  </span>
                  <p className="mt-1 text-xs font-bold text-white sm:text-sm">
                    {activeSlideData.caption}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={prevSlide}
                    aria-label="Previous showcase slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    aria-label="Next showcase slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Operating status list */}
              <ul className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3.5">
                {current.map((c) => (
                  <li key={c.title} className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                    <div>
                      <span className="block text-xs font-bold text-white sm:text-sm">{c.title}</span>
                      <span className="text-[11px] text-white/60">Active operations in Techiman</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-white/10 pt-3 sm:mt-5 sm:pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 sm:text-[11px]">
                  Planned expansion
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/75">
                  General trading, import &amp; export, agriculture-related trade, technology and
                  logistics.
                </p>
                <p className="mt-1 text-[10px] text-white/45">Planned only — not yet operating.</p>
              </div>

              {/* Slide thumbnail navigation bar */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 sm:mt-6 sm:pt-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {HERO_SLIDES.map((slide, index) => {
                    const active = index === currentSlide;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}: ${slide.badge}`}
                        className={`group relative h-2 rounded-full transition-all duration-300 ${
                          active ? "w-7 sm:w-8 bg-gold" : "w-2 bg-white/30 hover:bg-white/50"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-white/50 sm:text-[11px]">
                  <span>
                    0{currentSlide + 1} / 0{totalSlides}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPaused(!isPaused)}
                    className="ml-1 rounded p-1 text-white/60 hover:text-white"
                    title={isPaused ? "Play auto-slideshow" : "Pause auto-slideshow"}
                  >
                    {isPaused ? <Play size={11} /> : <Pause size={11} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
