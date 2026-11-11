import { site } from "@/data/site";

/** WhatsApp deep link with a prepared message. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Email link with a prepared subject and body. */
export function mailtoLink(subject: string, body: string): string {
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
