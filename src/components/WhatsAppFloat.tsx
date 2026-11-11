import { MessageCircle } from "lucide-react";
import { site } from "@/data/site";
export default function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello NOBYST, I would like to make an enquiry.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with NOBYST on WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        right: "max(1rem, env(safe-area-inset-right, 1rem))",
      }}
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
    </a>
  );
}
