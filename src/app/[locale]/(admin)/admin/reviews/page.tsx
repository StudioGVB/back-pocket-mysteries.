// @ts-nocheck
import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import ReviewsTable from '@/components/admin/ReviewsTable';

export default async function AdminReviewsPage(props: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const params = await props.params;
  const locale = params.locale;
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Manage Reviews</h1>
        <p className="text-gray-500 font-medium mt-2">View and publish customer reviews to the public site.</p>
      </div>

      <ReviewsTable reviews={allReviews} />
    </div>
  );
}
