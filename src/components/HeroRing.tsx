"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/** The one orchestrated moment: the logo's gold orbit draws itself behind the headline. */
export default function HeroRing() {
  const ref = useRef<SVGEllipseElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const len = el.getTotalLength();
    gsap.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: "power3.inOut", delay: 0.2 });
  }, []);
  return (
    <svg aria-hidden viewBox="0 0 800 400" className="pointer-events-none absolute -right-24 top-1/2 w-[140%] max-w-none -translate-y-1/2 -rotate-12 opacity-80 sm:w-[90%] lg:right-[-8%] lg:w-[70%]">
      <ellipse ref={ref} cx="400" cy="200" rx="380" ry="120" fill="none" stroke="#E8AE0C" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
