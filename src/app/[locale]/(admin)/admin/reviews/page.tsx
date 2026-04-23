import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { ReviewActions } from './ReviewActions';

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

  const allReviews = reviews || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Manage Reviews</h1>
        <p className="text-gray-500 font-medium mt-2">View and publish customer reviews to the public site.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4">Review</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allReviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                  No reviews submitted yet.
                </td>
              </tr>
            ) : (
              allReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-brand-dark">
                    {review.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 text-brand-pink">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-500 max-w-md truncate" title={review.review_text}>
                      {review.review_text}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      review.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ReviewActions review={review} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
