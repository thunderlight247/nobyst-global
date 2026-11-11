// Central content file. Edit here; components read from it.
export const site = {
  name: "NOBYST GLOBAL LTD",
  short: "NOBYST",
  tagline: "A Better Tomorrow",
  location: "Techiman, Ghana",
  region: "Techiman, Bono East Region, Ghana",
  email: "info@nobyst.com",
  phone: "+233 50 106 8350",
  whatsapp: "233501068350", // digits only, for wa.me links
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nobyst.com",
  positioning:
    "A Ghanaian enterprise based in Techiman, operating today in phone accessories retail and mobile money agency services, and building towards a diversified group.",
  intro:
    "NOBYST GLOBAL LTD is a Ghanaian enterprise based in Techiman. We operate phone accessories retail and mobile money agency services today, and we are preparing a measured expansion into trading, distribution, agriculture-related trade, technology and logistics.",
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

// Facts used on the About page. Keep these statements accurate.
export const companyFacts = [
  { label: "Legal name", value: "NOBYST GLOBAL LTD" },
  { label: "Commercial base", value: "Techiman, Bono East Region, Ghana" },
  { label: "Operating today", value: "Phone accessories retail and mobile money agency" },
  { label: "Planned expansion", value: "Trading, import & export, agriculture, technology, logistics" },
];

// ACTIVE operations. These divisions are open today.
export const current = [
  {
    icon: "smartphone",
    image: "accessories",
    title: "Phone accessories & retail",
    tag: "Retail division",
    text: "Everyday phone accessories and related retail products for customers in Techiman and beyond.",
    points: [
      "Chargers, cables, audio, cases, screen protection and phones",
      "Product guidance on fit and compatibility before you buy",
      "Availability checks and follow-up through WhatsApp",
    ],
    href: "/products",
    cta: "Browse the accessories catalogue",
  },
  {
    icon: "wallet",
    image: "payments",
    title: "Mobile money & banking agency",
    tag: "Agency services",
    text: "Agency services that help individuals and small businesses move and manage money closer to home.",
    points: [
      "Agency services for everyday cash and digital transactions",
      "Served from our commercial location in Techiman",
      "Ask in store or on WhatsApp about the services available",
    ],
    href: "/businesses#agency",
    cta: "View agency service details",
  },
];

// PLANNED, NOT OPERATIONAL. Shown separately everywhere on the site.
export const future = [
  {
    icon: "store",
    title: "General trading & distribution",
    text: "Wholesale and retail distribution of fast-moving consumer goods and general merchandise.",
  },
  {
    icon: "ship",
    title: "Import & export",
    text: "Sourcing and cross-border trade of quality goods into and out of Ghana.",
  },
  {
    icon: "sprout",
    title: "Agriculture-related trade",
    text: "Aggregation and trade in agricultural produce, starting with cocoa and staple crops.",
  },
  {
    icon: "cpu",
    title: "Technology services",
    text: "Digital services, device support and practical ICT solutions for small businesses.",
  },
  {
    icon: "truck",
    title: "Logistics services",
    text: "Distribution, haulage and last-mile delivery support for our goods and partners.",
  },
];

export const categories = [
  "Audio & headphones",
  "Chargers & cables",
  "Adapters, readers & storage",
  "Cases & screen protection",
  "Stands & mounts",
  "Phones & devices",
] as const;

// Phone families customers can filter by. Keep these to broad, recognisable groups.
export const phoneGroups = [
  { id: "iphone-usbc", label: "iPhone 15 and newer" },
  { id: "iphone-lightning", label: "iPhone 14 and earlier" },
  { id: "samsung", label: "Samsung Galaxy" },
  { id: "tecno-infinix-itel", label: "Tecno, Infinix & itel" },
  { id: "usbc-android", label: "Other USB-C Android phones" },
  { id: "micro-usb", label: "Older micro-USB phones" },
] as const;

export type PhoneGroupId = (typeof phoneGroups)[number]["id"];
