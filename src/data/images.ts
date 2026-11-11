// Section photography used by the marketing pages. Product photos live with each
// catalogue row in D1 (see db/seed.sql), not in this file.
//
// Placeholder stock photos, both free for commercial use:
//   payments — Unsplash, Ali Mkumbwa
//   team     — Pexels, PICHA Stock
// Swap in NOBYST's own photos when they are available.
export const images = {
  accessories: {
    src: "/images/accessories.jpg",
    alt: "Multi-tip charging cable set with its adapters laid out beside the case",
  },
  phoneDetail: {
    src: "/images/phone-detail.jpg",
    alt: "Range of smartphones shown from the front and back",
  },
  payments: {
    src: "/images/payments.jpg",
    alt: "Shopkeeper behind the counter of a stocked shop with a phone resting on the counter",
  },
  team: {
    src: "/images/team.jpg",
    alt: "Colleagues going through work together around a tablet in a meeting",
  },
} as const;

export type ImageKey = keyof typeof images;
