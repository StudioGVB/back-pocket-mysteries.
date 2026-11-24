import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { ReviewForm } from '@/components/marketing/ReviewForm';
import { getPublishedReviewsForPublicDisplay } from '@/app/actions/reviews';

export const unstable_instant = false;

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  await getDictionary(locale as Locale);

  return {
    title: `Reviews & Party Photos | Back Pocket Mysteries`,
    description: 'Read verified player and host reviews or rate your experience with Back Pocket Mysteries.',
    alternates: {
      canonical: `https://backpocketmysteries.com/en/reviews`,
    },
  };
}

export default async function ReviewsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  await getDictionary(locale as Locale);

  return (
    <div className="bg-white">
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16 text-center mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              Reviews
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.95]">
              HOW DID WE DO?<br />
              <span className="text-brand-pink italic">RATE YOUR NIGHT.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl mx-auto">
              We love hearing about the wild twists, the terrible accents, and who actually figured out the murderer. Let us know how your mystery party went!
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 lg:pb-32 space-y-20">
        <div className="max-w-2xl mx-auto">
          <ReviewForm />
        </div>

        <Suspense fallback={null}>
          <PublishedReviewsWall />
        </Suspense>
      </div>
    </div>
  );
}

async function PublishedReviewsWall() {
  const publishedReviews = await getPublishedReviewsForPublicDisplay({ limit: 24 });
  if (publishedReviews.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-10 border-t border-slate-100">
      <div className="text-center space-y-2">
        <span className="px-3.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-widest">
          Verified Party Nights
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
          What Players &amp; Hosts Are Saying
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {publishedReviews.map((rev) => (
          <div
            key={rev.id}
            className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-amber-400 text-sm">
                  {'★'.repeat(Math.max(1, Math.min(5, rev.rating || 5)))}
                </div>
                {(rev.characterRole || rev.mysteryTitle) && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    {rev.characterRole
                      ? `Played ${rev.characterRole}${rev.mysteryTitle ? ` • ${rev.mysteryTitle}` : ''}`
                      : rev.mysteryTitle}
                  </span>
                )}
              </div>

              {rev.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rev.photoUrl}
                  alt={`Party photo by ${rev.name}`}
                  className="w-full h-48 object-cover rounded-2xl border border-slate-200"
                />
              )}

              <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                &ldquo;{rev.cleanComment}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200/70">
              <span className="text-xs font-black text-slate-900">{rev.name}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                ✓ Verified Player
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

