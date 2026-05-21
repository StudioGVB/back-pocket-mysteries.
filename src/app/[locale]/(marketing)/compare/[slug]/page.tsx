import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { competitors, getCompetitor } from '@/data/competitors';

export async function generateStaticParams() {
  return competitors.map((competitor) => ({
    slug: competitor.slug,
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const competitor = getCompetitor(params.slug);
  
  if (!competitor) return {};
  
  return {
    title: `${competitor.name} vs Back Pocket Mysteries | Alternative & Review`,
    description: `Looking for a ${competitor.name} alternative? See our comprehensive review and compare features, pricing, and personalisation against Back Pocket Mysteries.`,
    keywords: competitor.searchKeywords.join(', '),
  };
}

export default async function CompetitorComparisonPage(props: { params: Promise<{ slug: string; locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  const competitor = getCompetitor(params.slug);

  if (!competitor) {
    notFound();
  }

  return (
    <div className="bg-white">
      {/* SEO Optimized Hero */}
      <div className="relative pt-12 pb-16 lg:pt-24 lg:pb-32 overflow-hidden bg-brand-dark">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <Link href={`/${locale}/compare`} className="inline-flex items-center gap-2 text-brand-pink font-bold text-sm mb-8 hover:text-white transition-colors">
              ← Back to Comparisons
            </Link>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-[0.9]">
              The Best <span className="text-brand-pink italic">{competitor.name}</span> Alternative
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 font-bold max-w-2xl leading-relaxed">
              If you're considering {competitor.name} for your next party, read our breakdown of how it works, its pricing, and why a fully personalised AI mystery might be a better fit.
            </p>
          </div>
        </div>
        {/* Background visual flair */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-pink/10 to-transparent pointer-events-none" />
      </div>

      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Main Content */}
          <div className="lg:w-2/3 space-y-16">
            
            <section>
              <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tighter mb-6">
                What is {competitor.name}?
              </h2>
              <p className="text-lg text-gray-600 font-medium leading-relaxed">
                {competitor.description}
              </p>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-green-50 rounded-3xl p-8 border border-green-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-green-700 mb-6 flex items-center gap-2">
                  <span className="text-xl">✓</span> What They Do Well
                </h3>
                <ul className="space-y-4">
                  {competitor.pros.map((pro, i) => (
                    <li key={i} className="text-green-900 font-bold text-sm flex gap-3">
                      <span className="text-green-500">•</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 rounded-3xl p-8 border border-red-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-red-700 mb-6 flex items-center gap-2">
                  <span className="text-xl">✗</span> Where They Fall Short
                </h3>
                <ul className="space-y-4">
                  {competitor.cons.map((con, i) => (
                    <li key={i} className="text-red-900 font-bold text-sm flex gap-3">
                      <span className="text-red-500">•</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <section>
              <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tighter mb-6">
                The Back Pocket Mysteries Difference
              </h2>
              <div className="prose prose-lg text-gray-600 font-medium max-w-none">
                <p className="mb-6">
                  While {competitor.name} offers a standard "off the shelf" experience where every buyer receives the exact same story, <strong>Back Pocket Mysteries</strong> takes a completely different approach.
                </p>
                <p className="mb-6">
                  Using advanced AI, we generate a 100% unique murder mystery game built specifically around <em>your</em> guests. You simply input who is coming to your party, and our system writes a cohesive, thrilling mystery where your friends are the suspects. 
                </p>
                <ul className="list-disc pl-6 space-y-2 font-bold text-brand-dark">
                  <li>Your friends' names are printed in the scripts.</li>
                  <li>Inside jokes and real-life relationships can be woven into the motives.</li>
                  <li>The game scales exactly to your guest count—no awkward missing characters.</li>
                  <li>It is ready to download and play instantly, for a fraction of the cost of physical kits.</li>
                </ul>
              </div>
            </section>

            <section className="bg-brand-dark rounded-3xl p-10 text-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-pink mb-4">The Final Verdict</h3>
              <p className="text-xl text-white font-bold leading-relaxed">
                "{competitor.verdict}"
              </p>
            </section>

          </div>

          {/* Sidebar / Quick Facts */}
          <div className="lg:w-1/3">
            <div className="sticky top-32 bg-gray-50 rounded-3xl p-8 border border-gray-200">
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-tighter mb-8 pb-4 border-b border-gray-200">
                Quick Comparison
              </h3>
              
              <div className="space-y-6 mb-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Pricing</p>
                  <p className="text-brand-dark font-bold">{competitor.price}</p>
                  <p className="text-xs text-gray-500 mt-1">{competitor.priceNote}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Format</p>
                  <p className="text-brand-dark font-bold">{competitor.format}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Group Size</p>
                  <p className="text-brand-dark font-bold">{competitor.groupSize}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Personalisation</p>
                  <p className="text-brand-dark font-bold">{competitor.personalisation}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200">
                <p className="text-sm font-bold text-center text-gray-600 mb-4">
                  Ready to try something better?
                </p>
                <Link 
                  href={`/${locale}/custom-murder-mystery`}
                  className="block w-full text-center px-6 py-4 bg-brand-pink text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/20"
                >
                  Create Your Mystery
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
