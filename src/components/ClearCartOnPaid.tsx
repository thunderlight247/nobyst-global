"use client";

import { useEffect } from "react";
import { useNobystStore } from "@/store/useStore";

/** Empties the saved cart once the server has confirmed payment. */
export default function ClearCartOnPaid() {
  const clearCart = useNobystStore((s) => s.clearCart);
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
