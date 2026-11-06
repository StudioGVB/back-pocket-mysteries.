import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { generatePinFromMysteryId } from '@/app/actions/customer-mystery';
import {
  getAllPaidMysteryIdsInStore,
  getCachedMysterySnapshot,
} from '@/lib/live-session-store';
import { checkAndFinalizeGenerationIfDue } from '@/lib/background-mystery-generator';
import FinishGenerationButton from '@/components/account/FinishGenerationButton';

export const unstable_instant = false;

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/orders`)}`);
  }

  // 1. Collect unlocked mystery IDs from local live-session store
  const unlockedMysteryIds = new Set<string>(getAllPaidMysteryIdsInStore());

  // 2. Collect unlocked mystery IDs from Supabase `orders` table (status = 'succeeded')
  try {
    let ordersQuery = supabase
      .from('orders')
      .select('mystery_id, status, user_id')
      .eq('status', 'succeeded');

    if (user?.id) {
      ordersQuery = ordersQuery.or(`user_id.eq.${user.id},user_id.is.null`);
    }

    const { data: ordersData } = await ordersQuery;
    for (const order of ordersData || []) {
      if (order.mystery_id) {
        unlockedMysteryIds.add(order.mystery_id);
      }
    }
  } catch {
    // non-fatal if orders table or RLS blocks read
  }

  // 3. Fetch mysteries from DB (both published and draft so any purchased mystery appears) and check carrier character `__game_session.isPaid`
  const { data: mysteriesData } = await supabase
    .from('mysteries')
    .select('id, title, theme, status, min_players, max_players, current_round, created_at')
    .order('created_at', { ascending: false });

  const allMysteryIds = (mysteriesData || []).map((m: any) => m.id);
  if (allMysteryIds.length > 0) {
    const { data: charRows } = await supabase
      .from('characters')
      .select('mystery_id, profile_data')
      .in('mystery_id', allMysteryIds);

    for (const row of charRows || []) {
      const profileData = row.profile_data as Record<string, any> | null;
      if (profileData?.__game_session?.isPaid === true) {
        unlockedMysteryIds.add(row.mystery_id);
      }
    }
  }

  // Merge DB mysteries with any cached mysteries that were unlocked by slug/id
  const mysteryByIdMap = new Map<string, any>();
  for (const m of mysteriesData || []) {
    if (unlockedMysteryIds.has(m.id)) {
      mysteryByIdMap.set(m.id, m);
    }
  }
  for (const unlockedId of unlockedMysteryIds) {
    if (!mysteryByIdMap.has(unlockedId)) {
      const cached = getCachedMysterySnapshot(unlockedId);
      if (cached && cached.id) {
        mysteryByIdMap.set(cached.id, cached);
      }
    }
  }

  const unlockedMysteries = Array.from(mysteryByIdMap.values());

  const stories = await Promise.all(
    unlockedMysteries.map(async (m: any) => {
      await Promise.all([
        getMysteryById(m.id),
        getRelationshipsByMysteryId(m.id),
      ]);
      const pin = await generatePinFromMysteryId(m.id);
      const generationState = await checkAndFinalizeGenerationIfDue({
        mysteryId: m.id,
        slug: m.id,
        mysteryTitle: m.title || 'Murder Mystery',
        customerEmail: user?.email || null,
        customerName: (user?.user_metadata?.full_name as string) || null,
        pin,
        locale,
      });

      return {
        ...m,
        pin,
        generationState,
      };
    })
  );

  return (
    <div className="w-full">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            My Mysteries (Stories)
          </h1>
          <p className="text-slate-500 font-medium text-base">
            Your custom murder mystery packages — open your Pre-Party Ready Hub for How to Play, 1-Click Group Chat Links, Character Outfits &amp; Host Set-Up Guide.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={`/${locale}/mysteries`}
            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:border-brand-pink hover:text-brand-pink transition-all text-center"
          >
            + Browse Mysteries
          </Link>
          <Link
            href={`/${locale}/play`}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-pink transition-all text-center"
          >
            🔑 Join with Game PIN →
          </Link>
        </div>
      </div>

      {stories.length > 0 ? (
        <div className="grid gap-6">
          {stories.map((story) => {
            const isGenerating = story.generationState?.status === 'generating';
            const minsLeft = Math.max(
              1,
              Math.ceil((story.generationState?.remainingSeconds || 60) / 60)
            );
            const progress = story.generationState?.progress ?? 100;

            return (
              <div
                key={story.id}
                className={`bg-white border p-6 sm:p-8 rounded-[2.25rem] flex flex-col gap-6 group transition-all duration-300 ${
                  isGenerating
                    ? 'border-brand-pink/30 shadow-lg shadow-brand-pink/5'
                    : 'border-slate-100 hover:shadow-xl hover:shadow-slate-200/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start sm:items-center gap-5">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform ${
                        isGenerating
                          ? 'bg-brand-pink/15 text-brand-pink animate-pulse'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isGenerating ? '☕' : '🎭'}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                          {story.title}
                        </h3>
                        {isGenerating ? (
                          <span className="px-3 py-1 bg-brand-pink/10 text-brand-pink border border-brand-pink/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                            ☕ Generating Package (~{minsLeft} min{minsLeft === 1 ? '' : 's'} left • We&apos;ll email you!)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                            ✓ Ready to Play
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black font-mono uppercase tracking-wider">
                          PIN: {story.pin.slice(0, 3)} {story.pin.slice(3)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>{story.theme || 'Murder Mystery'}</span>
                        <span>•</span>
                        <span>
                          {story.min_players || 4}–{story.max_players || 12} Players
                        </span>
                        <span>•</span>
                        <span className="text-brand-pink">
                          {isGenerating
                            ? story.generationState?.stepLabel || 'Brewing custom character dossiers & clues...'
                            : story.current_round === 0 || !story.current_round
                            ? 'Pre-Party Ready Hub Unlocked'
                            : story.current_round === 5
                            ? 'Reveal Stage'
                            : `Round ${story.current_round} Active`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {isGenerating ? (
                      <>
                        <Link
                          href={`/${locale}/mysteries/${story.id}/cast?view=generating`}
                          className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          ☕ View 20-Min Progress
                        </Link>
                        <FinishGenerationButton
                          mysteryId={story.id}
                          slug={story.id}
                          mysteryTitle={story.title}
                          pin={story.pin}
                          locale={locale}
                        />
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/${locale}/mysteries/${story.id}/ready`}
                          className="px-7 py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-95 transition-all shadow-lg active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                            boxShadow: '0 8px 20px -6px rgba(254,4,198,0.45)',
                          }}
                        >
                          🎉 Open Mystery Ready Hub (Guest Links &amp; How to Play) →
                        </Link>
                        <Link
                          href={`/${locale}/play/${story.id}?host=1`}
                          className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          🚀 Launch Live Game
                        </Link>
                        <Link
                          href={`/${locale}/mysteries/${story.id}/cast?edit=1`}
                          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          ✏️ Edit Cast
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {isGenerating && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>
                        ✅ Safe to close browser — we&apos;ll email <strong>{user.email}</strong> when your mystery is ready!
                      </span>
                      <span className="font-mono font-black text-brand-pink">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, #fe04c6 0%, #c026d3 100%)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
          <div className="bg-gradient-to-br from-slate-900 via-brand-dark to-slate-900 text-white border border-brand-pink/30 rounded-[3rem] p-12 sm:p-16 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/35 text-brand-pink text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
              Welcome to Back Pocket Mysteries
            </div>

            <div className="w-20 h-20 bg-white/10 border border-white/15 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">
              🕵️‍♀️
            </div>

            <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-4">
              Mysteries Coming Soon!
            </h3>

            <p className="text-slate-300 font-medium max-w-lg text-base sm:text-lg leading-relaxed mb-4">
              Thanks for signing up! We&apos;re putting the finishing touches on our murder mystery party packages. <strong className="text-white">Check back shortly</strong> — our first playable stories will be live right here very soon!
            </p>

            <p className="text-xs font-bold uppercase tracking-widest text-brand-pink mb-10">
              💡 While you wait, you can pre-save your friends in your Guest Roster so you&apos;re ready to cast in seconds
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href={`/${locale}/account/profile`}
                className="w-full sm:w-auto px-10 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all shadow-xl shadow-brand-pink/25 text-center"
              >
                + Pre-Build Your Guest List →
              </Link>
              <Link
                href={`/${locale}/account`}
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all text-center"
              >
                Go to Account Overview
              </Link>
            </div>
          </div>
      )}
    </div>
  );
}
