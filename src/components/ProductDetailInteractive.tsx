"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Image as ImageIcon, MessageCircle, Sparkles } from "lucide-react";
import ProductGallery, { type GalleryPhoto } from "@/components/ProductGallery";
import { useNobystStore } from "@/store/useStore";
import { site } from "@/data/site";

// Lazy-load the 3D viewer only when clicked to keep initial page load ultra lightweight on mobile
const ProductViewer3D = dynamic(() => import("@/components/ProductViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-navy/10 bg-slate-100">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-royal border-t-transparent" />
        <span className="text-xs font-bold text-navy/60">Initializing 3D Canvas…</span>
      </div>
    </div>
  ),
});

type Props = {
  photos: GalleryPhoto[];
  alt: string;
  productName: string;
  category: string;
  priceFormatted: string | null;
  model3dUrl?: string | null;
  colors?: string[];
};

export default function ProductDetailInteractive({
  photos,
  alt,
  productName,
  category,
  priceFormatted,
  model3dUrl,
  colors = [],
}: Props) {
  const [view3D, setView3D] = useState(false);
  const { selectedColor, setSelectedColor, getWhatsAppUrl } = useNobystStore();

  const availableColors =
    colors.length > 0 ? colors : ["Black", "Gold", "Navy", "Silver"];

  // Generate dynamic WhatsApp inquiry with product, color, and price
  const whatsappUrl = getWhatsAppUrl({
    productName,
    priceFormatted,
  });

  return (
    <div className="space-y-4">
      {/* Visual media container: 2D Gallery or 3D Inspector */}
      <div className="relative">
        {view3D ? (
          <ProductViewer3D
            modelUrl={model3dUrl}
            productName={productName}
            colors={availableColors}
            onClose={() => setView3D(false)}
          />
        ) : (
          <ProductGallery photos={photos} alt={alt} />
        )}

        {/* 3D toggle button (Available on products with 3D or device/charger categories) */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView3D(!view3D)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              view3D
                ? "bg-navy text-white shadow-md hover:bg-royal"
                : "border border-royal/30 bg-royal-50/70 text-royal hover:bg-royal hover:text-white"
            }`}
          >
            {view3D ? (
              <>
                <ImageIcon size={15} />
                <span>Switch to 2D Photos</span>
              </>
            ) : (
              <>
                <Box size={15} />
                <span>View in 3D Interactive (360°)</span>
                <span className="rounded-full bg-gold/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-gold-700">
                  New
                </span>
              </>
            )}
          </button>

          {model3dUrl && (
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <Sparkles size={12} />
              <span>3D Model Verified</span>
            </span>
          )}
        </div>
      </div>

      {/* Color / Variant Swatch Selector */}
      <div className="rounded-2xl border border-navy/10 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy">
            Color / Finish:{" "}
            <span className="font-extrabold text-royal">{selectedColor || availableColors[0]}</span>
          </span>
          <span className="text-[10px] text-navy/50">Techiman Stock</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {availableColors.map((col) => {
            const active = (selectedColor || availableColors[0]) === col;
            return (
              <button
                key={col}
                type="button"
                onClick={() => setSelectedColor(col)}
                className={`min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-navy text-white shadow-sm ring-2 ring-royal/30"
                    : "border border-navy/15 bg-white text-navy/80 hover:border-royal/40"
                }`}
              >
                {col}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic WhatsApp-First Conversion Action Button */}
      <div className="pt-2">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={whatsappUrl}
          className="group inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-lg active:scale-[0.98] sm:text-base"
        >
          <MessageCircle size={19} aria-hidden />
          <span>Check Availability / Order via WhatsApp</span>
        </a>
        <p className="mt-2 text-center text-xs text-navy/55">
          Pre-fills &ldquo;{productName}&rdquo; ({selectedColor || availableColors[0]})
          {priceFormatted ? ` at ${priceFormatted}` : ""} directly on WhatsApp
        </p>
      </div>
    </div>
  );
}
