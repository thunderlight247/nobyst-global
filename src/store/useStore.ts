import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  slug: string;
  name: string;
  image: string;
  pricePesewas: number | null;
  color: string;
  quantity: number;
};

export interface NobystStore {
  // Shopping cart (persisted to localStorage)
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateCartQuantity: (slug: string, color: string, quantity: number) => void;
  removeFromCart: (slug: string, color: string) => void;
  clearCart: () => void;

  // Category filter state
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  // 3D product viewer & variant swatch state
  selectedColor: string;
  setSelectedColor: (color: string) => void;

  // Active 3D mode toggle on PDP
  is3DMode: boolean;
  setIs3DMode: (active: boolean) => void;

}

export const useNobystStore = create<NobystStore>()(
  persist(
    (set) => ({
  cart: [],
  addToCart: (item, quantity = 1) =>
    set((state) => {
      const existing = state.cart.find((c) => c.slug === item.slug && c.color === item.color);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c === existing ? { ...c, quantity: Math.min(c.quantity + quantity, 99) } : c
          ),
        };
      }
      return { cart: [...state.cart, { ...item, quantity: Math.min(quantity, 99) }] };
    }),
  updateCartQuantity: (slug, color, quantity) =>
    set((state) => ({
      cart: state.cart
        .map((c) =>
          c.slug === slug && c.color === color
            ? { ...c, quantity: Math.max(0, Math.min(quantity, 99)) }
            : c
        )
        .filter((c) => c.quantity > 0),
    })),
  removeFromCart: (slug, color) =>
    set((state) => ({ cart: state.cart.filter((c) => !(c.slug === slug && c.color === color)) })),
  clearCart: () => set({ cart: [] }),

  selectedCategory: "All",
  setSelectedCategory: (category: string) => set({ selectedCategory: category }),

  selectedColor: "Default",
  setSelectedColor: (color: string) => set({ selectedColor: color }),

  is3DMode: false,
  setIs3DMode: (is3DMode: boolean) => set({ is3DMode }),

    }),
    {
      name: "nobyst-cart",
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
