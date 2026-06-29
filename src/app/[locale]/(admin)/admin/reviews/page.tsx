// @ts-nocheck
import React, { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import ReviewsTable from '@/components/admin/ReviewsTable';

export const unstable_instant = false;

export default async function AdminReviewsPage(props: { params: Promise<{ locale: string }> }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Manage Reviews</h1>
        <p className="text-gray-500 font-medium mt-2">View and publish customer reviews to the public site.</p>
      </div>

      <Suspense fallback={<ReviewsTableSkeleton />}>
        <ReviewsContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ReviewsContent({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
  }

  let allReviews = reviews || [];

  if (error && error.code === 'PGRST205') {
    allReviews = [{
      id: 'mock-1',
      name: 'Michael Scott',
      rating: 5,
      review_text: 'Absolutely incredible! We played the "Midnight at the Manor" theme for our corporate retreat. The customized inside jokes had everyone in tears laughing. Highly recommend!',
      status: 'pending',
      created_at: new Date().toISOString()
    }];
  }

  return <ReviewsTable reviews={allReviews} />;
}

function ReviewsTableSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-8 animate-pulse">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 py-4 border-b border-gray-50 last:border-0">
            <div className="flex justify-between">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-4 bg-slate-100 rounded w-16"></div>
            </div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
