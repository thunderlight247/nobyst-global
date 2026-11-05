import type { MetadataRoute } from "next";
import { site } from "@/data/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/businesses", "/products", "/partnerships", "/contact"].map((p) => ({ url: `${site.url}${p}`, lastModified: new Date() }));
}
