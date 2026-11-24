import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import LegalNav from '@/components/marketing/LegalNav';

export const metadata: Metadata = {
  title: 'Privacy Policy | Back Pocket Mysteries',
  description:
    'How Back Pocket Mysteries collects, uses, protects, and deletes host account data, guest roster traits, reference photos, and AI-generated murder mystery party content.',
  alternates: {
    canonical: 'https://backpocketmysteries.com/en/privacy',
  },
};

export default async function PrivacyPolicyPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="pt-12 pb-12 lg:pt-16 lg:pb-16 border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-[10px] font-black tracking-[0.22em] uppercase text-white bg-brand-dark rounded-full">
            <span className="w-2 h-2 rounded-full bg-brand-pink" />
            Legal &amp; Data Protection • Last Updated: November 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-dark tracking-tighter uppercase leading-[0.95]">
            Privacy <span className="text-brand-pink italic">Policy.</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-semibold mt-4 max-w-2xl leading-relaxed">
            Because Back Pocket Mysteries builds custom murder mystery games around your real guest list, we take your privacy—and your friends&apos; photos, traits, and inside jokes—seriously.
          </p>
          <LegalNav locale={locale} />
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-6 max-w-4xl pt-12 space-y-10">
        {/* Highlight Callout Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-brand-dark text-white border-2 border-brand-dark shadow-[8px_8px_0px_#fe04c6] space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
            Our Core Privacy Promise
          </p>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Your Friends&apos; Photos &amp; Inside Jokes Are Never Sold or Used for Public AI Training.
          </h2>
          <p className="text-sm text-white/80 font-medium leading-relaxed">
            Any guest names, physical traits, inside jokes, or reference photos you add to your Guest Roster are used strictly to generate your private murder mystery pack. We never sell customer or guest data, and you can permanently delete any guest profile or your entire account at any time.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            1. Who We Are (Data Controller)
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            Back Pocket Mysteries (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is operated by{' '}
            <strong>Back Pocket Games</strong> (Australian Business Number:{' '}
            <strong>ABN 76 756 351 480</strong>, registered in Victoria 3925, Australia —{' '}
            <a
              href="https://backpocketgames.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-pink font-bold hover:underline"
            >
              backpocketgames.com
            </a>
            ) and provides an online platform at{' '}
            <a
              href="https://backpocketmysteries.com"
              className="text-brand-dark font-bold hover:underline"
            >
              backpocketmysteries.com
            </a>{' '}
            for creating, customizing, and hosting interactive murder mystery party games. For any privacy or data-protection requests, you can contact our Data Protection Lead directly at{' '}
            <a href="mailto:hello@backpocketgames.com" className="text-brand-pink font-bold hover:underline">
              hello@backpocketgames.com
            </a>
            .
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            2. Information We Collect
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#f8f7fa] border border-gray-200 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                A. Host Account &amp; Billing Data
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                When you register or purchase a mystery pack, we collect your name, email address, encrypted authentication credentials (via Supabase Auth), and transaction records. Payment card details are processed directly by <strong>Stripe</strong>; we never store raw credit card numbers on our servers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f7fa] border border-gray-200 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                B. Guest Roster &amp; AI Personalization Data
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                To personalize your mystery, you may enter guest names, optional email addresses (for sending pre-party character invites), appearance traits (hair, glasses, beard, outfit style), regional accent preferences, inside jokes, and optional reference photos.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f7fa] border border-gray-200 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                C. Live Playroom &amp; Party Session Data
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                During a party, our Live Hosting Playroom stores your 6-digit Game PIN, claimed character roles, extra Detective guest names, round progression, and suspect voting tallies so players can participate from their phones.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f7fa] border border-gray-200 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                D. Technical, Cookie &amp; Analytics Data
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                We collect standard device, browser, country, and page-visit telemetry via Vercel Web Analytics and Google Analytics to keep the site fast, secure, and reliable.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            3. How We Use AI &amp; Protect Guest Photos
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            When you click <strong>Generate Mystery</strong>, our personalization engine sends your selected character traits, inside jokes, and optional reference descriptions/photos to our enterprise AI sub-processors:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base text-gray-600 font-medium">
            <li>
              <strong>Google Cloud / Gemini API:</strong> Used to tailor character bios, leaked text threads, costume portraits, and lookalike crime-scene clue images to your cast. Paid commercial API requests are isolated and are not used by Google to train public foundation models.
            </li>
            <li>
              <strong>ElevenLabs API:</strong> Used to synthesize fictional intercepted audio wiretaps and voicemails in the regional accent selected for each character (we do not clone your guests&apos; real voices).
            </li>
            <li>
              <strong>Private Access Only:</strong> Generated character invites and clue packs are accessible only via unique, unindexed UUID links and your private 6-digit Game PIN. All player and invite routes carry strict <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">noindex, nofollow</code> headers so search engines never index your party.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            4. Legal Bases for Processing (UK / EU GDPR)
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            If you are located in the United Kingdom or European Economic Area, we process your personal data under the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base text-gray-600 font-medium">
            <li><strong>Performance of a Contract:</strong> To create your account, process your payment, generate your custom mystery pack, and run your Live Playroom session.</li>
            <li><strong>Consent:</strong> For optional marketing newsletters, VIP waitlist updates, and non-essential cookies (which you may withdraw at any time).</li>
            <li><strong>Legitimate Interests:</strong> For fraud prevention, security, and aggregate product analytics.</li>
            <li><strong>Legal Obligation:</strong> For tax, accounting, and statutory financial record-keeping.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            5. Trusted Sub-Processors &amp; Third Parties
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            We share data only with the infrastructure providers required to deliver the service:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Data Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                <tr>
                  <td className="p-4 font-black text-brand-dark">Supabase</td>
                  <td className="p-4">Authentication, Database &amp; Media Storage</td>
                  <td className="p-4">Account profile, guest roster, generated mystery assets</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-brand-dark">Stripe</td>
                  <td className="p-4">Payment Processing &amp; Subscriptions</td>
                  <td className="p-4">Billing details, payment method, transaction history</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-brand-dark">Google Gemini API</td>
                  <td className="p-4">AI Story Hydration &amp; Clue Image Rendering</td>
                  <td className="p-4">Character traits, inside jokes, outfit/appearance prompts</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-brand-dark">ElevenLabs</td>
                  <td className="p-4">AI Audio Wiretap Synthesis</td>
                  <td className="p-4">Fictional clue script lines &amp; regional accent tag</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-brand-dark">Resend</td>
                  <td className="p-4">Transactional &amp; Party Invite Emails</td>
                  <td className="p-4">Recipient email address, order &amp; character invite links</td>
                </tr>
                <tr>
                  <td className="p-4 font-black text-brand-dark">Vercel</td>
                  <td className="p-4">Cloud Hosting &amp; First-Party Web Analytics</td>
                  <td className="p-4">Anonymized request telemetry &amp; page performance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            6. Data Retention &amp; Your Deletion Rights
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            We keep your Guest Roster and generated mystery packs available in your account so you can reuse your guest list for future parties. Regardless of whether you live in the UK, EU, Australia, Canada, or the United States, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base text-gray-600 font-medium">
            <li><strong>Delete Any Guest:</strong> Remove any guest profile, photo, or inside joke directly from your Guest Roster tab in 1 click.</li>
            <li><strong>Delete Your Entire Account:</strong> Request full account erasure at any time via your account settings or by emailing <a href="mailto:hello@backpocketgames.com" className="text-brand-pink font-bold hover:underline">hello@backpocketgames.com</a>. We will permanently wipe your profile, guest roster, and custom mystery packs within 7 days.</li>
            <li><strong>Access, Export, or Correct Data:</strong> Request a copy of all personal data we hold about you.</li>
          </ul>
        </section>

        {/* Footer Contact Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#f8f7fa] border-2 border-brand-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Questions About Privacy or Data Deletion?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">
              Email us at <span className="text-brand-dark font-bold">hello@backpocketgames.com</span> and we will respond within 24–48 hours.
            </p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="px-6 py-3 rounded-full bg-brand-dark text-white hover:bg-brand-pink text-xs font-black uppercase tracking-widest transition-colors text-center shrink-0"
          >
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
