// @ts-nocheck
import React, { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import ReviewsTable from '@/components/admin/ReviewsTable';
import { getReviewMetadataMap, getAllPlatformReviews } from '@/app/actions/reviews';
import { ALL_CANONICAL_MYSTERIES } from '@/data/active-mysteries';

export const unstable_instant = false;

const DEPRECATED_OR_TEST_TITLES = new Set([
  'ho ho homicide',
  'midnight at the manor',
  'testing',
  'test',
  'untitled mystery',
]);

function normalizeMysteryBaseTitle(rawTitle: string | null | undefined): string | null {
  const clean = String(rawTitle || '').trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();
  if (lower.includes('christmas') || lower.includes('ho ho homicide')) {
    return 'Christmas Nightmare';
  }
  if (lower.includes('love on the rocks') || lower.includes('reality')) {
    return 'Love On The Rocks';
  }
  if (DEPRECATED_OR_TEST_TITLES.has(lower)) {
    return 'General / Custom Mystery';
  }
  return clean;
}

export default async function AdminReviewsPage(props: { params: Promise<{ locale: string }> }) {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            Social Proof &amp; Reputation Intelligence
          </p>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
            Manage Reviews &amp; Ratings
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Star rating analytics, most-reviewed Mystery Bases, order-to-review conversion rate &amp; public moderation queue.
          </p>
        </div>
      </div>

      <Suspense fallback={<ReviewsTableSkeleton />}>
        <ReviewsContent params={props.params} />
      </Suspense>
    </div>
  );
}

function inferMysteryBaseForReview(
  review: any,
  metaMap: Record<string, any>,
  knownBases: string[],
  ordersByReviewerName: Map<string, string>
): string {
  // 1. Explicit admin tag in review-metadata.json or DB column
  const metaTitle = normalizeMysteryBaseTitle(
    metaMap[review.id]?.mysteryTitle || review.mystery_title || review.mystery_name
  );
  if (metaTitle) {
    return metaTitle;
  }

  // 2. Match reviewer name to customer orders
  const reviewerNameKey = String(review.name || '')
    .toLowerCase()
    .trim();
  if (reviewerNameKey && ordersByReviewerName.has(reviewerNameKey)) {
    const orderBase = normalizeMysteryBaseTitle(ordersByReviewerName.get(reviewerNameKey));
    if (orderBase) return orderBase;
  }

  // 3. Scan review_text for known Mystery Base titles
  const text = String(review.review_text || '');
  const textLower = text.toLowerCase();

  for (const base of knownBases) {
    if (base && textLower.includes(base.toLowerCase())) {
      return base;
    }
  }

  if (textLower.includes('christmas') || textLower.includes('homicide')) {
    return 'Christmas Nightmare';
  }
  if (textLower.includes('love on the rocks') || textLower.includes('villa')) {
    return 'Love On The Rocks';
  }

  return 'General / Custom Mystery';
}

async function ReviewsContent({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const supabase = await createClient();

  const [mysteriesRes, ordersRes, profilesRes, metaMap] = await Promise.all([
    supabase
      .from('mysteries')
      .select('id, title, theme, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, user_id, mystery_id, status')
      .in('status', ['succeeded', 'qa_verified']),
    supabase.from('profiles').select('id, full_name, email'),
    getReviewMetadataMap(),
  ]);

  const dbMysteries = mysteriesRes.data || [];
  const mysteryTitleById = new Map<string, string>();
  const baseTitleSet = new Set<string>();

  for (const canonical of ALL_CANONICAL_MYSTERIES || []) {
    if (canonical.title) baseTitleSet.add(canonical.title);
  }
  for (const m of dbMysteries) {
    if (m.id && m.title) {
      const normalized = normalizeMysteryBaseTitle(m.title);
      if (normalized) {
        mysteryTitleById.set(m.id, normalized);
      }
    }
  }

  const allReviews = await getAllPlatformReviews(supabase, mysteryTitleById);

  const profileNameById = new Map<string, string>();
  for (const p of profilesRes.data || []) {
    if (p.id && p.full_name) {
      profileNameById.set(p.id, String(p.full_name).toLowerCase().trim());
    }
  }

  const ordersByReviewerName = new Map<string, string>();
  const completedOrders = ordersRes.data || [];
  for (const o of completedOrders) {
    const pName = o.user_id ? profileNameById.get(o.user_id) : null;
    const mTitle = o.mystery_id ? mysteryTitleById.get(o.mystery_id) : null;
    if (pName && mTitle) {
      ordersByReviewerName.set(pName, mTitle);
    }
  }

  const knownBases = Array.from(baseTitleSet);

  const enrichedReviews = allReviews.map((r: any) => ({
    ...r,
    mysteryBaseTitle: inferMysteryBaseForReview(r, metaMap, knownBases, ordersByReviewerName),
  }));

  return (
    <ReviewsTable
      reviews={enrichedReviews}
      availableBases={knownBases}
      totalCompletedOrders={completedOrders.length}
    />
  );
}

function ReviewsTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-[28px]" />
        ))}
      </div>
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-8 animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 py-4 border-b border-gray-50 last:border-0"
            >
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
    </div>
  );
}
