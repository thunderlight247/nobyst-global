import { MessageCircle } from "lucide-react";
import { site } from "@/data/site";
export default function WhatsAppFloat() {
  return (
    <a href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello NOBYST, I would like to make an enquiry.")}`}
      target="_blank" rel="noopener noreferrer" aria-label="Chat with NOBYST on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-lg transition-transform hover:scale-105">
      <MessageCircle />
    </a>
  );
}
