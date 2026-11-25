"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * On the payment status page: the provider's confirmation can arrive a few seconds after the
 * customer is sent back, so re-check every few seconds for about two minutes.
 */
export default function PendingPaymentRefresh() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 30) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 4000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return tries < 30 ? (
    <p className="mt-4 text-xs text-navy/55" aria-live="polite">Checking for confirmation…</p>
  ) : null;
}
