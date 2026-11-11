import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/data/site";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A1550",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description:
    "NOBYST GLOBAL LTD is a Ghanaian enterprise in Techiman operating phone accessories retail and mobile money agency services, with planned expansion into trading, distribution, agriculture, technology and logistics.",
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.positioning,
    url: site.url,
    siteName: site.name,
    type: "website",
    locale: "en_GH",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.positioning,
    images: ["/og.png"],
  },
  icons: { icon: [{ url: "/icon.png", type: "image/png" }], apple: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <WhatsAppFloat />
        </SmoothScroll>
      </body>
    </html>
  );
}
