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

  const totalSlides = HERO_SLIDES.length;

  // Auto-change slide every 4.5 seconds (paused on hover)
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

  return (
    <section
      aria-label="Hero Showcase"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative isolate min-h-[620px] overflow-hidden bg-navy text-white sm:min-h-[700px] lg:min-h-[760px]"
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
                  className="object-cover object-center"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* READABILITY & CONTRAST GRADIENT OVERLAYS */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/50"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-royal-900/40 via-transparent to-navy/70"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-navy to-transparent"
      />

      {/* MAIN HERO CONTENT */}
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Brand Copy & CTAs */}
          <div className="lg:col-span-7 lg:pr-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold sm:text-xs">
                <span>{site.name}</span>
                <span className="mx-2 text-gold/40">•</span>
                <span className="text-white/80">{site.location}</span>
              </p>
            </div>

            <h1 className="mt-5 max-w-xl font-display text-[2.2rem] font-extrabold leading-[1.07] tracking-tight text-balance sm:text-5xl lg:text-[3.6rem]">
              Building trust.
              <br />
              Delivering solutions.
              <br />
              <span className="text-gold">Growing together.</span>
            </h1>

            <div aria-hidden className="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-gold to-amber-500" />

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 text-pretty sm:text-lg">
              {site.intro}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
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

              <Link
                href="/about"
                className="inline-flex min-h-[48px] items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:border-white hover:bg-white/15 active:scale-[0.98] sm:text-base"
              >
                About the company
              </Link>

              <Link
                href="/partnerships"
                className="group inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-bold text-white/80 transition-colors hover:text-gold"
              >
                <span>Partner with us</span>
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Phone Device Showcase Card */}
          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
              {/* Active Slide Feature Card */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {HERO_SLIDES[currentSlide].badge}
                  </span>
                  <p className="mt-1 text-sm font-bold text-white">
                    {HERO_SLIDES[currentSlide].caption}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={prevSlide}
                    aria-label="Previous showcase slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    aria-label="Next showcase slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Operating status list */}
              <ul className="mt-5 space-y-3.5">
                {current.map((c) => (
                  <li key={c.title} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                    <div>
                      <span className="block text-sm font-bold text-white">{c.title}</span>
                      <span className="text-xs text-white/60">Active operations in Techiman</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                  Planned expansion
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                  General trading, import &amp; export, agriculture-related trade, technology and
                  logistics.
                </p>
                <p className="mt-1 text-[10px] text-white/45">Planned only — not yet operating.</p>
              </div>

              {/* Slide thumbnail navigation bar */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  {HERO_SLIDES.map((slide, index) => {
                    const active = index === currentSlide;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}: ${slide.badge}`}
                        className={`group relative h-2 rounded-full transition-all duration-300 ${
                          active ? "w-8 bg-gold" : "w-2 bg-white/30 hover:bg-white/50"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>
                    0{currentSlide + 1} / 0{totalSlides}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPaused(!isPaused)}
                    className="ml-1 text-white/60 hover:text-white"
                    title={isPaused ? "Play auto-slideshow" : "Pause auto-slideshow"}
                  >
                    {isPaused ? <Play size={12} /> : <Pause size={12} />}
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
