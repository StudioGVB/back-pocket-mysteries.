import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { competitors } from '@/data/competitors';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `Best Murder Mystery Party Game Alternatives | ${dict.common.siteTitle}`,
    description: `Compare the top murder mystery party games. See how Hunt a Killer, My Mystery Party, and Night of Mystery stack up against Back Pocket Mysteries.`,
  };
}

export default async function CompareHubPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-brand-dark">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-[0.9]">
              Compare <span className="text-brand-pink italic">Alternatives</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-300 font-bold max-w-xl mx-auto leading-relaxed">
              Looking for the perfect murder mystery party game? See how the traditional boxed kits and downloaded PDFs compare to a fully personalised, AI-generated experience.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {competitors.map((competitor) => (
            <div key={competitor.slug} className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col h-full hover:border-brand-pink hover:shadow-xl transition-all">
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2 block">Alternative To</span>
                <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
                  {competitor.name}
                </h2>
                <p className="text-gray-500 font-bold text-sm">{competitor.tagline}</p>
              </div>
              
              <div className="space-y-4 mb-8 flex-grow">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price</p>
                  <p className="text-brand-dark font-bold">{competitor.price}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Personalisation</p>
                  <p className="text-brand-dark font-bold text-sm">{competitor.personalisation}</p>
                </div>
              </div>

              <Link 
                href={`/${locale}/compare/${competitor.slug}`}
                className="w-full text-center px-6 py-4 bg-gray-100 text-brand-dark rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-pink hover:text-white transition-all duration-300"
              >
                Read Full Comparison
              </Link>
            </div>
          ))}
        </div>

        {/* Why Choose BPM Section */}
        <div className="mt-32 bg-brand-pink/5 rounded-3xl p-12 lg:p-20 border border-brand-pink/20 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 tracking-tighter uppercase">
            Why Back Pocket Mysteries Wins
          </h2>
          <p className="text-lg text-gray-600 font-bold max-w-2xl mx-auto mb-12">
            Traditional murder mystery kits are static — the same story, the same characters, the same clues for every buyer. Back Pocket Mysteries uses AI to generate a completely unique, highly personalised mystery based on your theme, your guest list, and your inside jokes.
          </p>
          <Link 
            href={`/${locale}/custom-murder-mystery`}
            className="inline-block px-10 py-5 bg-brand-pink text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/20"
          >
            Create Your Custom Mystery
          </Link>
        </div>
      </div>
    </div>
  );
}
