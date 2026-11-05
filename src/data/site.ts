// Central content file. Edit here; components read from it.
export const site = {
  name: "NOBYST GLOBAL LTD",
  short: "NOBYST",
  tagline: "A Better Tomorrow",
  location: "Techiman, Ghana",
  email: "info@nobyst.com",
  phone: "+233 50 106 8350",
  whatsapp: "233501068350", // digits only, for wa.me links
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nobyst.com",
  intro:
    "NOBYST GLOBAL LTD is a Ghanaian enterprise based in Techiman. We are building a trusted, diversified business, starting with phone accessories and related customer services, and pursuing sustainable growth in other industries.",
  mission:
    "Deliver dependable products and practical services that create value for customers and business partners, guided by trust, service and continuous improvement.",
  vision:
    "Become a respected Ghanaian enterprise with a strong presence across multiple industries, creating opportunities and contributing to a better tomorrow.",
  philosophy:
    "We value lasting relationships, practical solutions, dependable service, continuous improvement and sustainable growth.",
};
export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/businesses", label: "Our Businesses" },
  { href: "/products", label: "Products" },
  { href: "/partnerships", label: "Partner with us" },
  { href: "/contact", label: "Contact" },
];
export const values = [
  { title: "Trust", text: "Honest dealings and dependable service, every time." },
  { title: "Solution", text: "Practical answers to real customer and partner needs." },
  { title: "Growth", text: "Continuous improvement and sustainable expansion." },
  { title: "People", text: "Lasting relationships with customers, partners and our team." },
];
export const current = [
  { icon: "smartphone", image: "phones", title: "Phone accessories & retail", text: "Everyday phone accessories and related retail products for customers in Techiman and beyond." },
  { icon: "wallet", image: "payments", title: "Mobile money & banking agency", text: "Convenient agency services for people and small businesses who need to move and manage money close to home." },
];
// Planned, NOT operational. Shown separately on the site.
export const future = [
  { icon: "store", title: "General trading & distribution", image: "retail" },
  { icon: "ship", title: "Import & export", image: "logistics" },
  { icon: "sprout", title: "Agriculture-related trade", image: "agriculture" },
  { icon: "cpu", title: "Technology services", image: "technology" },
  { icon: "truck", title: "Logistics services", image: "logistics" },
];
export const categories = ["Chargers & cables", "Power banks", "Earphones & audio", "Phone cases & screen guards", "Holders & stands"] as const;
// ILLUSTRATIVE SAMPLE ENTRIES. Replace with real inventory. No prices or stock are claimed.
export const products = [
  { id: "p1", name: "USB-C fast charging cable", category: "Chargers & cables", description: "Braided USB-C cable for charging and data. Sample entry." },
  { id: "p2", name: "Wall charger adapter", category: "Chargers & cables", description: "Single-port wall adapter for everyday charging. Sample entry." },
  { id: "p3", name: "Portable power bank", category: "Power banks", description: "Pocket power bank for on-the-go top-ups. Sample entry." },
  { id: "p4", name: "Wired earphones", category: "Earphones & audio", description: "In-ear earphones with inline microphone. Sample entry." },
  { id: "p5", name: "Wireless earbuds", category: "Earphones & audio", description: "Bluetooth earbuds with charging case. Sample entry." },
  { id: "p6", name: "Protective phone case", category: "Phone cases & screen guards", description: "Shock-absorbing case; model fit to be confirmed. Sample entry." },
  { id: "p7", name: "Tempered glass screen guard", category: "Phone cases & screen guards", description: "Scratch-resistant screen protection. Sample entry." },
  { id: "p8", name: "Adjustable phone stand", category: "Holders & stands", description: "Desk stand for calls, video and viewing. Sample entry." },
];
