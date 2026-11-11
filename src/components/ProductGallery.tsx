"use client";
import { useState } from "react";
import Image from "next/image";

export type GalleryPhoto = { src: string; alt: string };

export default function ProductGallery({ photos, alt }: { photos: GalleryPhoto[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = photos[active] ?? photos[0];
  if (!current) return null;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-navy/10 bg-royal-100/50 shadow-sm">
        <Image
          src={current.src}
          alt={current.alt || alt}
          fill
          priority
          sizes="(min-width:1024px) 45vw, 100vw"
          className="object-cover"
        />
      </div>

      {photos.length > 1 && (
        <ul
          className="mt-3 flex gap-2.5 overflow-x-auto pb-1"
          aria-label={`${photos.length} product photos`}
        >
          {photos.map((photo, i) => (
            <li key={`${photo.src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-current={i === active}
                className={`relative block h-16 w-20 overflow-hidden rounded-xl border-2 transition-colors sm:h-20 sm:w-24 ${
                  i === active ? "border-royal" : "border-transparent hover:border-navy/20"
                }`}
              >
                <Image src={photo.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-navy/50">
        {photos.length > 1 ? `${photos.length} photos. ` : ""}
        Colours and packaging vary with each delivery — confirm on WhatsApp.
      </p>
    </div>
  );
}
