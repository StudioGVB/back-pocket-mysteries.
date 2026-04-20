import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `${dict.common.howItWorks} | ${dict.common.siteTitle}`,
    description: dict.howItWorks.subtitle,
  };
}

export default async function HowItWorksPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const steps = [
    {
      ...dict.howItWorks.steps.pick,
      step: '01',
      accent: 'bg-brand-pink',
      imageLabel: 'Theme Selection'
    },
    {
      ...dict.howItWorks.steps.guests,
      step: '02',
      accent: 'bg-brand-blue',
      imageLabel: 'Guest Personalisation'
    },
    {
      ...dict.howItWorks.steps.download,
      step: '03',
      accent: 'bg-emerald-500',
      imageLabel: 'Pack Download'
    }
  ];

  return (
    <div className="py-20 lg:py-32 bg-white">
      <div className="container mx-auto px-6">

        {/* Page Header */}
        <div className="max-w-3xl mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            {dict.howItWorks.badge}
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.95]">
            {dict.howItWorks.title.split(',')[0]}<br />
            <span className="text-brand-pink italic">{dict.howItWorks.title.split(',')[1]}</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
            {dict.howItWorks.subtitle}
          </p>
        </div>
        
        {/* Steps */}
        <div className="space-y-32">
          {steps.map((item, i) => (
            <div key={i} className={`flex flex-col lg:flex-row gap-16 lg:items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <div className={`inline-block px-4 py-1 rounded-full text-white font-bold text-sm ${item.accent} mb-6`}>
                  STEP {item.step}
                </div>
                <h2 className="text-4xl font-black text-brand-dark mb-6 uppercase tracking-tight leading-[1.1]">{item.title}</h2>
                <p className="text-lg text-gray-500 leading-relaxed font-medium mb-8">
                  {item.desc}
                </p>
                <ul className="space-y-4">
                  {item.bullets.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-brand-dark font-bold">
                      <div className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}>✓</div>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="aspect-video bg-brand-gray rounded-[2rem] border-2 border-gray-100 flex items-center justify-center relative overflow-hidden group shadow-inner hover:border-brand-pink transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-gray-300 font-black tracking-widest uppercase text-xs">{item.imageLabel}</span>
                  <div className="absolute top-4 left-4 w-24 h-2 bg-gray-200 rounded-full"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="absolute top-8 right-8 w-8 h-8 bg-brand-pink/20 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* What's In The Pack */}
        <div className="mt-48 py-20 px-12 lg:px-24 bg-brand-gray rounded-[3rem] border-2 border-gray-100">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-4 uppercase tracking-tight">
              {dict.howItWorks.packContents.title.split(',').map((part, i) => (
                <span key={i} className={i === 1 ? 'text-brand-pink italic' : ''}>
                  {part}
                </span>
              ))}
            </h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto">{dict.howItWorks.packContents.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(dict.howItWorks.packContents.items).map(([key, item], i) => (
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <div className="w-10 h-10 bg-brand-pink rounded-xl mb-6 group-hover:scale-110 transition-transform"></div>
                <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-3">{item.title}</h3>
                <p className="text-gray-500 font-semibold leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-40 text-center bg-brand-dark rounded-[3rem] p-16 lg:p-24 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.95]">
              {dict.howItWorks.cta.title.split(',')[0]}<br />
              <span className="text-brand-pink italic">{dict.howItWorks.cta.title.split(',')[1]}</span>
            </h2>
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-bold">
              {dict.howItWorks.cta.desc.replace('{{price}}', '$19')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/${locale}/themes`} className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95">
                {dict.howItWorks.cta.ctaThemes}
              </Link>
              <Link href={`/${locale}/pricing`} className="px-10 py-5 bg-white/10 text-white border-2 border-white/20 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95">
                {dict.howItWorks.cta.ctaPricing}
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px]"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
