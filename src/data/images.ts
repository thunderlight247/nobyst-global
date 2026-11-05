// Illustrative Unsplash stock photos (https://unsplash.com/license). NOT photos of NOBYST.
// Replace any `src` with a local file in /public (e.g. "/images/shop.jpg") when real photos exist.
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;
export const images = {
  phones: { src: u("photo-1511707171634-5f897ff02aa9"), alt: "Smartphone held in hand (stock photo)" },
  retail: { src: u("photo-1556740738-b6a63e27c4df"), alt: "Retail counter and payment (stock photo)" },
  payments: { src: u("photo-1556742049-0cfed4f6a45d"), alt: "Card and mobile payment (stock photo)" },
  logistics: { src: u("photo-1586528116311-ad8dd3c8310d"), alt: "Warehouse and distribution (stock photo)" },
  agriculture: { src: u("photo-1500382017468-9049fed747ef"), alt: "Farmland (stock photo)" },
  technology: { src: u("photo-1518770660439-4636190af475"), alt: "Circuit board technology (stock photo)" },
  team: { src: u("photo-1521737604893-d14cc237f11d"), alt: "Business team meeting (stock photo)" },
};
export type ImageKey = keyof typeof images;
export const categoryImage: Record<string, ImageKey> = {
  "Chargers & cables": "technology",
  "Power banks": "phones",
  "Earphones & audio": "phones",
  "Phone cases & screen guards": "phones",
  "Holders & stands": "retail",
};
export const imageCredits = "All photos are Unsplash stock images used for illustration only; record photographer credits here when final photos are chosen.";
