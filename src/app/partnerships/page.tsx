import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";
export const metadata: Metadata = { title: "Partner with us", description: "Suppliers, distributors and collaborators: enquire about working with NOBYST GLOBAL LTD." };
export default function Partnerships() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-5xl font-extrabold">Let us work together</h1>
        <p className="mt-4 text-navy/75">We are open to conversations with suppliers, distributors and organisations who share our commitment to dependable products and practical services.</p>
        <p className="mt-4 text-navy/75">Tell us who you are and what you have in mind. We will respond using the contact details you provide.</p>
      </div>
      <div className="rounded-2xl bg-white p-6 ring-1 ring-navy/10 sm:p-8"><EnquiryForm /></div>
    </section>
  );
}
