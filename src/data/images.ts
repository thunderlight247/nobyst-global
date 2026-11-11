// Local illustrative photography (Pexels licence). These are not photos of NOBYST premises.
export const images = {
  accessories: {
    src: "/images/accessories.jpg",
    alt: "Phone chargers, a cable and a clear phone case laid out for display",
  },
  phoneDetail: {
    src: "/images/phone-detail.jpg",
    alt: "Smartphone connected to a charging cable",
  },
  payments: {
    src: "/images/payments.jpg",
    alt: "Hand holding a smartphone during a digital payment",
  },
  team: {
    src: "/images/team.jpg",
    alt: "Business team reviewing plans around a meeting table",
  },

  // Product photography — one distinct image per catalogue line.
  usbCable: {
    src: "/images/products/usb-cable.jpg",
    alt: "Braided USB-C charging cable with a metal connector on a marble surface",
  },
  wallCharger: {
    src: "/images/products/wall-charger.jpg",
    alt: "White wall charger adapter standing on a dark surface",
  },
  powerBank: {
    src: "/images/products/power-bank.jpg",
    alt: "Smartphone charging from a portable power bank via an orange cable",
  },
  wiredEarphones: {
    src: "/images/products/wired-earphones.jpg",
    alt: "White wired earphones resting on sheet music",
  },
  wirelessEarbuds: {
    src: "/images/products/wireless-earbuds.jpg",
    alt: "Black wireless earbuds in an open charging case",
  },
  phoneCase: {
    src: "/images/products/phone-case.jpg",
    alt: "Clear protective phone case on a light background",
  },
  screenGuard: {
    src: "/images/products/screen-guard.jpg",
    alt: "Hand holding a tempered glass screen protector beside a smartphone",
  },
  phoneStand: {
    src: "/images/products/phone-stand.jpg",
    alt: "Smartphone mounted on an adjustable desk stand",
  },
} as const;

export type ImageKey = keyof typeof images;
