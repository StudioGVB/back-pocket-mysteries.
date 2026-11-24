import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import LegalNav from '@/components/marketing/LegalNav';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Back Pocket Mysteries',
  description:
    'Refund, replacement, and subscription cancellation policy for Back Pocket Mysteries custom digital murder mystery party packs.',
  alternates: {
    canonical: 'https://backpocketmysteries.com/en/refund-policy',
  },
};

export default async function RefundPolicyPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="pt-12 pb-12 lg:pt-16 lg:pb-16 border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-[10px] font-black tracking-[0.22em] uppercase text-white bg-brand-dark rounded-full">
            <span className="w-2 h-2 rounded-full bg-brand-pink" />
            Consumer Protection • Last Updated: November 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-dark tracking-tighter uppercase leading-[0.95]">
            Refund &amp; Cancellation <span className="text-brand-pink italic">Policy.</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-semibold mt-4 max-w-2xl leading-relaxed">
            Clear, fair rules for digital mystery pack purchases, AI generation guarantees, and Unlimited Monthly Pass cancellations.
          </p>
          <LegalNav locale={locale} />
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-4xl pt-12 space-y-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-brand-dark text-white border-2 border-brand-dark shadow-[8px_8px_0px_#fe04c6] space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
            Our Party-Night Guarantee
          </p>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            If Your Mystery Fails to Generate or Has a Technical Issue, We Fix It Free or Refund You 100%.
          </h2>
          <p className="text-sm text-white/80 font-medium leading-relaxed">
            We want your party night to be unforgettable. If you experience any generation failure, broken clue, or technical issue that prevents you from hosting, email us at <span className="text-brand-pink font-bold">hello@backpocketgames.com</span> and we will re-generate your pack or issue a full refund.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            1. Un-Generated Mystery Packs (14-Day Full Refund Window)
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            If you purchase a One-Time Mystery Package (Basic, Premium, or Grand) and have <strong>not yet clicked &ldquo;Lock In Cast &amp; Generate Mystery&rdquo;</strong>, you may request a full 100% refund for any reason within <strong>14 days of purchase</strong> by emailing <a href="mailto:hello@backpocketgames.com" className="text-brand-pink font-bold hover:underline">hello@backpocketgames.com</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            2. Custom AI-Generated Digital Packs
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            Under UK and EU Consumer Contracts Regulations (Digital Content Exception), once you lock in your cast and initiate custom AI generation—which immediately provisions bespoke character bios, costume portraits, lookalike crime-scene clue images, and voice wiretaps specific to your guests—the digital service has been delivered and is generally non-refundable, <strong>except</strong> where:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base text-gray-600 font-medium">
            <li>Your pack experiences a technical defect or generation error that our team cannot immediately resolve for your party; or</li>
            <li>You were accidentally charged twice for the same order.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            3. Unlimited Monthly Pass Cancellations
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            You can cancel your <strong>Unlimited Monthly Pass</strong> at any time in 1 click from your Account Settings or by emailing <a href="mailto:hello@backpocketgames.com" className="text-brand-pink font-bold hover:underline">hello@backpocketgames.com</a>. Your membership benefits will remain active through the end of your current paid billing period, and you will never be charged again. If you forgot to cancel and have not generated any mysteries during the new billing cycle, contact us within 7 days of the renewal charge for a full refund of that renewal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            4. How Refunds Are Processed
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            Approved refunds are issued back to your original payment method via <strong>Stripe</strong> within 1–2 business days (banks typically post the funds within 3–5 business days).
          </p>
        </section>

        <div className="p-6 sm:p-8 rounded-3xl bg-[#f8f7fa] border-2 border-brand-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Need a Refund or Pack Re-Generation?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">
              Email <span className="text-brand-dark font-bold">hello@backpocketgames.com</span> • Operated by{' '}
              <a
                href="https://backpocketgames.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-pink font-bold hover:underline"
              >
                Back Pocket Games
              </a>{' '}
              (ABN 76 756 351 480).
            </p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="px-6 py-3 rounded-full bg-brand-dark text-white hover:bg-brand-pink text-xs font-black uppercase tracking-widest transition-colors text-center shrink-0"
          >
            Request Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
