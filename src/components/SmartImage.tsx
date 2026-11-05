"use client";
import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { images, type ImageKey } from "@/data/images";

/** Loads a stock image by key; shows a branded placeholder if it cannot load. */
export default function SmartImage({
  name,
  className = "",
  imgClassName = "",
  priority = false,
  sizes = "(min-width:1024px) 50vw, 100vw",
}: {
  name: ImageKey;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const img = images[name];
  return (
    <div className={`relative overflow-hidden bg-royal-100 ${className}`}>
      {failed ? (
        <div role="img" aria-label={img.alt} className="flex h-full w-full items-center justify-center text-royal/50">
          <ImageOff />
        </div>
      ) : (
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${imgClassName}`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
