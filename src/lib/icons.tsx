import { Smartphone, Wallet, Store, Ship, Sprout, Cpu, Truck, type LucideProps } from "lucide-react";
const map = { smartphone: Smartphone, wallet: Wallet, store: Store, ship: Ship, sprout: Sprout, cpu: Cpu, truck: Truck };
export function Icon({ name, ...p }: { name: string } & LucideProps) {
  const C = map[name as keyof typeof map] ?? Store;
  return <C aria-hidden {...p} />;
}
