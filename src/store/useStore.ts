import { create } from "zustand";

export interface NobystStore {
  // Category filter state
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  // 3D product viewer & variant swatch state
  selectedColor: string;
  setSelectedColor: (color: string) => void;

  // Active 3D mode toggle on PDP
  is3DMode: boolean;
  setIs3DMode: (active: boolean) => void;

  // WhatsApp inquiry generator
  getWhatsAppUrl: (options: {
    productName: string;
    priceFormatted?: string | null;
    customNote?: string;
  }) => string;
}

export const useNobystStore = create<NobystStore>((set, get) => ({
  selectedCategory: "All",
  setSelectedCategory: (category: string) => set({ selectedCategory: category }),

  selectedColor: "Default",
  setSelectedColor: (color: string) => set({ selectedColor: color }),

  is3DMode: false,
  setIs3DMode: (is3DMode: boolean) => set({ is3DMode }),

  getWhatsAppUrl: ({ productName, priceFormatted, customNote }) => {
    const { selectedColor } = get();
    const parts = [
      `Hello NOBYST, I would like to check availability for: ${productName}.`,
    ];

    if (selectedColor && selectedColor !== "Default") {
      parts.push(`Preferred colour / finish: ${selectedColor}.`);
    }

    if (priceFormatted) {
      parts.push(`Listed price: ${priceFormatted}.`);
    }

    if (customNote) {
      parts.push(customNote);
    } else {
      parts.push("My phone model / requirement is: ");
    }

    // Number: 233203245658
    const message = parts.join(" ");
    return `https://wa.me/233203245658?text=${encodeURIComponent(message)}`;
  },
}));
