import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `Custom Murder Mystery | ${dict.common.siteTitle}`,
    description: dict.seoLanding.seoDescription,
    alternates: {
      canonical: `https://mysteries.backpocketgames.com/${locale}/custom-murder-mystery`,
    }
  }
}

export default async function CustomMurderMysteryPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Custom Murder Mystery Game",
    "description": dict.seoLanding.seoDescription,
    "brand": {
      "@type": "Brand",
      "name": "Back Pocket Mysteries"
    },
    "category": "Games",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "10.00",
      "highPrice": "16.00",
      "offerCount": "4"
    }
  };

  return (
    <div className="relative overflow-hidden bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-brand-dark border-b-4 border-brand-pink">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-tight">
              {dict.seoLanding.title.split('Custom')[0]} 
              <span className="text-brand-pink italic">Custom</span> 
              {dict.seoLanding.title.split('Custom')[1]}
            </h1>
            <p className="text-xl lg:text-2xl text-gray-400 mb-10 font-medium">
              {dict.seoLanding.subtitle}
            </p>
            <div className="flex justify-center">
              <Link href={`/${locale}/pricing`} className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
                {dict.seoLanding.ctaButton}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Custom Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tight">
                {dict.seoLanding.whyCustomTitle}
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed font-medium">
                {dict.seoLanding.whyCustomDesc}
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center shrink-0 font-black text-sm">1</span>
                  <div>
                    <h3 className="text-xl font-black text-brand-dark uppercase">{dict.seoLanding.features.f1}</h3>
                    <p className="text-gray-500">{dict.seoLanding.features.f1Desc}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center shrink-0 font-black text-sm">2</span>
                  <div>
                    <h3 className="text-xl font-black text-brand-dark uppercase">{dict.seoLanding.features.f2}</h3>
                    <p className="text-gray-500">{dict.seoLanding.features.f2Desc}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center shrink-0 font-black text-sm">3</span>
                  <div>
                    <h3 className="text-xl font-black text-brand-dark uppercase">{dict.seoLanding.features.f3}</h3>
                    <p className="text-gray-500">{dict.seoLanding.features.f3Desc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-brand-pink/5 rounded-[40px] -skew-y-3"></div>
              <Image 
                src="/hero-mystery-playing.png" 
                alt="Custom Murder Mystery" 
                width={600} 
                height={600}
                className="relative rounded-[30px] shadow-2xl border-4 border-white object-cover aspect-square"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-brand-gray border-t border-gray-200">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-8 uppercase tracking-tight">
            {dict.seoLanding.ctaTitle}
          </h2>
          <Link href={`/${locale}/pricing`} className="inline-block px-12 py-5 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
            {dict.seoLanding.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
