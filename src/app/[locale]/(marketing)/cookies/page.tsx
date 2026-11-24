import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import LegalNav from '@/components/marketing/LegalNav';

export const metadata: Metadata = {
  title: 'Cookie Policy | Back Pocket Mysteries',
  description:
    'How Back Pocket Mysteries uses essential authentication cookies, currency preferences, and first-party analytics.',
  alternates: {
    canonical: 'https://backpocketmysteries.com/en/cookies',
  },
};

export default async function CookiePolicyPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="pt-12 pb-12 lg:pt-16 lg:pb-16 border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-[10px] font-black tracking-[0.22em] uppercase text-white bg-brand-dark rounded-full">
            <span className="w-2 h-2 rounded-full bg-brand-pink" />
            Cookies &amp; Local Storage • Last Updated: November 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-dark tracking-tighter uppercase leading-[0.95]">
            Cookie <span className="text-brand-pink italic">Policy.</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-semibold mt-4 max-w-2xl leading-relaxed">
            What cookies and local storage tokens we use to keep you logged in, remember your currency, and run Live Game Mode.
          </p>
          <LegalNav locale={locale} />
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-4xl pt-12 space-y-10">
        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            1. How We Use Cookies &amp; Local Storage
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            Back Pocket Mysteries (operated by <strong>Back Pocket Games</strong>, <strong>ABN 76 756 351 480</strong> —{' '}
            <a
              href="https://backpocketgames.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-pink font-bold hover:underline"
            >
              backpocketgames.com
            </a>
            ) uses a minimal set of cookies and browser <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">localStorage</code> keys to authenticate your Host account, remember your local currency (<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">GBP / USD / EUR / AUD / CAD</code>), and keep players connected to the Live Hosting Playroom during a murder mystery party.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            2. Cookie Categories
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="p-4">Name / Key</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Purpose &amp; Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                <tr>
                  <td className="p-4 font-mono text-xs font-black text-brand-dark">sb-*-auth-token</td>
                  <td className="p-4">Strictly Necessary</td>
                  <td className="p-4">Maintains your encrypted Supabase login session (up to 30 days).</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-black text-brand-dark">sb-keep-logged-in</td>
                  <td className="p-4">Strictly Necessary</td>
                  <td className="p-4">Remembers your &ldquo;Keep me signed in&rdquo; preference on login.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-black text-brand-dark">bpm_currency</td>
                  <td className="p-4">Functional</td>
                  <td className="p-4">Stores your selected display currency (GBP, USD, EUR, AUD, CAD).</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-black text-brand-dark">bpm_playroom_*</td>
                  <td className="p-4">Strictly Necessary</td>
                  <td className="p-4">Keeps guests and Extra Guest Detectives connected to their claimed role during Live Game Mode.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-xs font-black text-brand-dark">_ga / Vercel Analytics</td>
                  <td className="p-4">Analytics</td>
                  <td className="p-4">Measures aggregate page views, traffic sources, and page speed performance.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
            3. Managing or Disabling Cookies
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            You can clear or block cookies at any time through your browser settings. Please note that blocking strictly necessary authentication cookies (<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">sb-*-auth-token</code>) will prevent you from logging into the Host Dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
