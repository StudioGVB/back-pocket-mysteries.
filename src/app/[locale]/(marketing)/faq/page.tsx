import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import JsonLd from '@/components/marketing/JsonLd';
import FAQSearch from '@/components/marketing/FAQSearch';
import { faqsData } from '@/data/faqs';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `${dict.common.faq} | Back Pocket Mysteries`,
    description: dict.faqPage?.seoDescription || "Frequently Asked Questions about our custom murder mystery parties.",
  }
}

export default async function FAQPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqsData.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="bg-white min-h-screen">
      <JsonLd data={jsonLdData} />
      
      {/* Header section */}
      <div className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('/noise.png')] mix-blend-overlay"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/20">
              {dict.common.faq}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-[0.9]">
              {dict.faqPage?.title ? dict.faqPage.title.replace('Questions.', '') : 'Frequently Asked '} <br className="hidden md:block" />
              <span className="text-brand-pink italic">Questions.</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-400 font-bold max-w-2xl mx-auto text-center">
              {dict.faqPage?.subtitle || 'Everything you need to know about hosting.'}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ content */}
      <div className="container mx-auto px-6 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          
          <FAQSearch faqs={faqsData} />

          {/* CTA Section */}
          <div className="mt-32 text-center p-12 lg:p-16 rounded-[3rem] bg-gray-50 border-2 border-gray-100 relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <h2 className="text-3xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tight relative z-10">
              Ready to <span className="text-brand-pink italic">host?</span>
            </h2>
            <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto mb-10 relative z-10">
              Your party is happening either way. Let's make it one they actually remember.
            </p>
            <Link href={`/${locale}/themes`} className="relative z-10 inline-block px-12 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-dark transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
              {dict.common.browseThemes}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
