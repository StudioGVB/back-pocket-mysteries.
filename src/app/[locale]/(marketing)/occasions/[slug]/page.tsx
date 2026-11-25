import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  OCCASION_SEO_PAGES,
  getOccasionSeoPageBySlug,
} from '@/data/occasion-seo-pages';
import { getPublicMarketingMysteries } from '@/services/mysteries';
import FreeMysteryLeadForm from '@/components/marketing/FreeMysteryLeadForm';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { Locale } from '@/lib/i18n-config';

export async function generateStaticParams() {
  return OCCASION_SEO_PAGES.map((p) => ({
    locale: 'en',
    slug: p.slug,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const pageData = getOccasionSeoPageBySlug(slug);

  if (!pageData) {
    return {
      title: 'Not Found | Back Pocket Mysteries',
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `https://backpocketmysteries.com/en/occasions/${pageData.slug}`;

  return {
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    keywords: pageData.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageData.metaTitle,
      description: pageData.metaDescription,
      url: canonicalUrl,
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [{ url: '/og-image.png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageData.metaTitle,
      description: pageData.metaDescription,
      images: ['/og-image.png'],
    },
  };
}

export default async function OccasionSeoLandingPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await props.params;
  const pageData = getOccasionSeoPageBySlug(slug);

  if (!pageData) {
    notFound();
  }

  const otherOccasions = OCCASION_SEO_PAGES.filter((p) => p.slug !== pageData.slug);
  const publicMysteries = await getPublicMarketingMysteries();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://backpocketmysteries.com/en',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageData.navLabel,
        item: `https://backpocketmysteries.com/en/occasions/${pageData.slug}`,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pageData.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${pageData.title} ${pageData.titleHighlight}`,
    description: pageData.metaDescription,
    brand: {
      '@type': 'Brand',
      name: 'Back Pocket Mysteries',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GBP',
      lowPrice: '15.00',
      highPrice: '25.00',
      offerCount: '3',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '48',
    },
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Breadcrumb Bar */}
      <div className="bg-slate-50 border-b border-gray-100 py-3">
        <div className="container mx-auto px-6 flex items-center gap-2 text-[11px] font-bold text-gray-400">
          <Link href={`/${locale}`} className="hover:text-brand-pink transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-brand-dark">{pageData.navLabel}</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-14 lg:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/20">
                <span>{pageData.emoji}</span>
                <span>{pageData.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter text-brand-dark uppercase leading-[0.98]">
                {pageData.title}{' '}
                <span className="text-brand-pink italic">{pageData.titleHighlight}</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed max-w-2xl">
                {pageData.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-wider text-brand-dark">
                <span className="px-4 py-2 rounded-full bg-slate-100">
                  👥 {pageData.groupSizeLabel}
                </span>
                <span className="px-4 py-2 rounded-full bg-slate-100">
                  ⚡ {pageData.prepTimeLabel}
                </span>
                <span className="px-4 py-2 rounded-full bg-brand-pink/10 text-brand-pink">
                  From <PriceDisplay tier="basic" locale={locale as Locale} />
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href={`/${locale}/themes`}
                  className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-xl text-center"
                >
                  Choose Your Mystery Theme →
                </Link>
                <Link
                  href={`/${locale}/how-it-works`}
                  className="px-8 py-4 bg-white text-brand-dark border-2 border-gray-200 rounded-full font-black uppercase tracking-widest text-xs hover:border-brand-pink transition-all text-center"
                >
                  See How It Works
                </Link>
              </div>
            </div>

            {/* Embedded First 50 VIP Free Mystery Lead Capture */}
            <div className="lg:col-span-5">
              <FreeMysteryLeadForm locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Section & Highlights */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl space-y-12">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink">
              Personalised For Your Group
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
              {pageData.whyTitle}
            </h2>
            {pageData.whyParagraphs.map((para, idx) => (
              <p key={idx} className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pageData.highlights.map((h, i) => (
              <div
                key={i}
                className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-brand-dark text-white flex items-center justify-center font-black text-sm">
                  0{i + 1}
                </div>
                <h3 className="text-lg font-black uppercase text-brand-dark">{h.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  {h.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Mystery Themes */}
      <section className="py-20 bg-brand-gray border-y border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink mb-2">
                Ready to Play Tonight
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
                Best Murder Mystery Themes for {pageData.navLabel}
              </h2>
            </div>
            <Link
              href={`/${locale}/themes`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              Browse All Themes →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {publicMysteries.map((m) => (
              <div
                key={m.slug}
                className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    {m.theme} • {m.min_players}–{m.max_players} Players
                  </span>
                  <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                    {m.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {m.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href={`/${locale}/themes/${m.slug}`}
                    className="px-6 py-3 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-pink transition-colors"
                  >
                    View Cast &amp; Story →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {pageData.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-2"
              >
                <h3 className="text-base sm:text-lg font-black text-brand-dark">
                  {faq.question}
                </h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Links to Other Occasions & Guides (Internal SEO Mesh) */}
      <section className="py-16 bg-slate-50 border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl space-y-8">
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">
            Explore More Murder Mystery Party Guides &amp; Occasions
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {otherOccasions.map((occ) => (
              <Link
                key={occ.slug}
                href={`/${locale}/occasions/${occ.slug}`}
                className="p-5 rounded-2xl bg-white border border-gray-100 hover:border-brand-pink shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2">{occ.emoji}</div>
                <p className="text-xs font-black uppercase tracking-wider text-brand-dark group-hover:text-brand-pink transition-colors">
                  {occ.navLabel} →
                </p>
              </Link>
            ))}
            <Link
              href={`/${locale}/free-murder-mystery-game`}
              className="p-5 rounded-2xl bg-white border border-gray-100 hover:border-brand-pink shadow-sm transition-all group"
            >
              <div className="text-2xl mb-2">🎁</div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-dark group-hover:text-brand-pink transition-colors">
                Free Murder Mystery Giveaway →
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
