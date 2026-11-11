import { stockLabel, type StockStatus } from "@/lib/catalogue";

const TONES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low_stock: "bg-amber-50 text-amber-700 ring-amber-200",
  out_of_stock: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

export default function StockBadge({
  status,
  className = "",
}: {
  status: StockStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${TONES[status]} ${className}`}
    >
      {stockLabel(status)}
    </span>
  );
}
