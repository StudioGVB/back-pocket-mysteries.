'use server';

import { createClient } from '@/utils/supabase/server';

export async function submitReview(formData: FormData) {
  const name = formData.get('name') as string;
  const rating = parseInt(formData.get('rating') as string, 10);
  const review_text = formData.get('review_text') as string;

  if (!name || !review_text || isNaN(rating) || rating < 1 || rating > 5) {
    return { error: 'Please provide a valid name, rating (1-5), and review text.' };
  }

  const supabase = await createClient();

  // Try to insert into reviews table
  const { error } = await supabase.from('reviews').insert({
    name,
    rating,
    review_text,
    status: 'pending'
  });

  if (error) {
    console.error('Review submission error:', error);
    return { error: 'Failed to submit review. Please try again later.' };
  }

  return { success: true };
}

export async function toggleReviewStatus(reviewId: string, currentStatus: string) {
  const supabase = await createClient();
  const newStatus = currentStatus === 'published' ? 'pending' : 'published';

  const { error } = await supabase
    .from('reviews')
    .update({ status: newStatus })
    .eq('id', reviewId);

  if (error) {
    console.error('Failed to toggle review status:', error);
    throw new Error('Failed to toggle review status');
  }

  return { success: true, newStatus };
}
