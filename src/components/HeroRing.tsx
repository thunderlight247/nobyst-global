"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/** A restrained gold orbit that frames the hero snapshot panel instead of crossing the headline. */
export default function HeroRing() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const paths = Array.from(svg.querySelectorAll<SVGGeometryElement>("[data-draw]"));
    const timeline = gsap.timeline();
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      timeline.to(p, { strokeDashoffset: 0, duration: 1.6, ease: "power3.inOut" }, i * 0.18);
    });

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox="0 0 520 420"
      fill="none"
      className="pointer-events-none absolute -inset-x-7 -inset-y-6 h-[calc(100%+3rem)] w-[calc(100%+3.5rem)]"
    >
      <defs>
        <linearGradient id="hero-orbit" x1="40" y1="380" x2="480" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8AE0C" stopOpacity="0" />
          <stop offset="30%" stopColor="#F3C63F" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#E8AE0C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E8AE0C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-orbit-soft" x1="500" y1="380" x2="20" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8AE0C" stopOpacity="0" />
          <stop offset="45%" stopColor="#E8AE0C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E8AE0C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse
        data-draw
        cx="260"
        cy="210"
        rx="212"
        ry="176"
        transform="rotate(-18 260 210)"
        stroke="url(#hero-orbit)"
        strokeWidth="2.2"
      />
      <ellipse
        data-draw
        cx="262"
        cy="220"
        rx="244"
        ry="112"
        transform="rotate(13 262 220)"
        stroke="url(#hero-orbit-soft)"
        strokeWidth="1.2"
      />
      <circle cx="452" cy="96" r="3" fill="#E8AE0C" opacity="0.8" />
    </svg>
  );
}
