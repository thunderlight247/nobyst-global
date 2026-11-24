import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How NOBYST GLOBAL LTD collects, uses and protects your personal data.",
};

// Draft written from what the site actually collects. Have it reviewed against the Data
// Protection Act, 2012 (Act 843) before relying on it.
const UPDATED = "24 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-navy">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-navy/80">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-navy/55">Last updated {UPDATED}</p>
      <p className="mt-5 text-sm leading-relaxed text-navy/80">
        {site.name} (&ldquo;NOBYST&rdquo;, &ldquo;we&rdquo;) runs nobyst.com and the NOBYST mobile app. This policy
        explains what personal data we collect, why, who we share it with, how long we keep it and the rights you
        have under Ghana&apos;s Data Protection Act, 2012 (Act 843). We are based in {site.location}.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Your account:</strong> name, email address and a scrambled (hashed) form of your password. We never see or store your actual password.</li>
          <li><strong>Orders:</strong> what you buy, the name, email and phone number you give at checkout, and your delivery address or pickup choice.</li>
          <li><strong>Payments:</strong> processed by Paystack. We receive the payment result and amount; we never receive or store your card or mobile money details.</li>
          <li><strong>Messages:</strong> what you send through our contact, support and partner forms.</li>
          <li><strong>Partners:</strong> business name, contact details, products, sales and the payout details you give us.</li>
          <li><strong>Security records:</strong> sign-ins, failed sign-in attempts and account changes, with the IP address and browser type, to protect accounts from misuse.</li>
          <li><strong>On your device:</strong> one sign-in cookie on the website (and a secure token in the app), and your shopping cart saved in your browser. We do not use advertising or tracking cookies.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <p>To run your account, take payment, deliver your orders and send receipts and delivery updates; to answer your messages; to run the partner marketplace and pay partners; to keep accounts and payments secure and prevent fraud; and to meet our legal and tax obligations.</p>
      </Section>

      <Section title="Who we share it with">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Partner sellers:</strong> if you buy a product sold by a partner, that partner receives your name, phone number and delivery details so they can deliver it. They do not see your other items or payment details.</li>
          <li><strong>Paystack</strong> processes payments; <strong>Resend</strong> delivers our emails; <strong>Cloudflare</strong> hosts the website, database and files and protects them from attacks; <strong>Zoho</strong> hosts our email inbox. They process data only to provide these services to us.</li>
          <li>Authorities, when the law requires it.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section title="How long we keep it">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your account: until you delete it.</li>
          <li>Paid orders: as long as accounting and tax law requires. If you delete your account, we keep the order amounts and items but remove your name, email, phone and address.</li>
          <li>Security records: 12 months.</li>
          <li>Messages: as long as needed to deal with them.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>You can ask to see, correct or delete your personal data, and object to how we use it. You can do much of this yourself:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>See your data:</strong> <Link href="/account" className="font-bold text-royal underline">My account</Link> → Download my data.</li>
          <li><strong>Delete your account:</strong> My account → Delete my account (partner and staff accounts: email us).</li>
          <li><strong>Anything else:</strong> email <a href={`mailto:${site.email}`} className="font-bold text-royal underline">{site.email}</a> or call {site.phone}.</li>
        </ul>
        <p>If you are unhappy with how we handle your data, you can complain to Ghana&apos;s Data Protection Commission.</p>
      </Section>

      <Section title="How we protect it">
        <p>Connections are encrypted, passwords are hashed, staff accounts require two-step sign-in, access to customer data is limited to the people who need it, and sign-ins and account changes are logged.</p>
      </Section>

      <Section title="Children">
        <p>Our services are not meant for children under 18, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>We will update this page when our practices change and show the date at the top. For important changes we will also tell account holders by email.</p>
      </Section>
    </article>
  );
}
