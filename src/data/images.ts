// Section photography used by the marketing pages. Product photos live with each
// catalogue row in D1 (see db/seed.sql), not in this file.
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
    alt: "Hand holding a smartphone during a digital payment",
  },
  team: {
    src: "/images/team.jpg",
    alt: "Business team reviewing plans around a meeting table",
  },
} as const;

export type ImageKey = keyof typeof images;
