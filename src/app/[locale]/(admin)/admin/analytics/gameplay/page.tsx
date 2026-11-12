import React, { Suspense } from 'react';
import Link from 'next/link';
import { getGameplayAnalytics } from '@/app/actions/admin-analytics';
import { AnalyticsNav } from '@/components/admin/AnalyticsNav';

export const unstable_instant = false;

export default async function GameplayAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            Platform Intelligence
          </p>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
            Gameplay &amp; Party Engagement
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Live party progression from Lobby to Reveal, cast utilization &amp; detective solve accuracy vs. killer escapes
          </p>
        </div>
      </div>

      <AnalyticsNav locale={locale} />

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 bg-slate-100 animate-pulse rounded-[28px]" />
              ))}
            </div>
            <div className="h-96 bg-slate-100 animate-pulse rounded-[32px]" />
          </div>
        }
      >
        <GameplayAnalyticsContent locale={locale} />
      </Suspense>
    </div>
  );
}

async function GameplayAnalyticsContent({ locale }: { locale: string }) {
  const data = await getGameplayAnalytics();
  const maxStageCount = Math.max(...data.stageFunnel.map((s) => s.count), 1);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Active / Started Parties
          </p>
          <p className="text-3xl font-black text-brand-dark mt-2">
            {data.summary.activeSessionsCount}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Out of {data.summary.totalMysteries} total mysteries
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Players Claimed / Assigned
          </p>
          <p className="text-3xl font-black text-brand-pink mt-2">
            {data.summary.totalClaimedPlayers}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            {data.summary.totalGuestsInAddressBook} saved in host guestbooks
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Theories / Votes Cast
          </p>
          <p className="text-3xl font-black text-brand-dark mt-2">
            {data.summary.totalTheoriesSubmitted}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Across Round 1, Round 2 &amp; Final Guess
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Detective Solve Rate
          </p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {data.summary.detectiveSolveRate}%
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Killer escapes {data.summary.killerEscapeRate}% of guesses
          </p>
        </div>
      </div>

      {/* Stage Funnel & Round Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Party Stage Funnel */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">
            Game Progression Funnel
          </h2>
          <p className="text-xs font-bold text-gray-400 mb-6">
            Where mysteries currently sit along the Lobby → Round → Guess → Reveal flow
          </p>
          <div className="space-y-4">
            {data.stageFunnel.map((item, i) => {
              const widthPct = Math.round((item.count / maxStageCount) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-700">{item.stage}</span>
                    <span className="font-black text-brand-dark">{item.count} mysteries</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-dark rounded-full transition-all"
                      style={{ width: `${Math.max(widthPct, item.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detective Accuracy by Round */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">
            Detective Solve Rate by Voting Step
          </h2>
          <p className="text-xs font-bold text-gray-400 mb-6">
            How accurately players identify the true killer as more clues unlock each round
          </p>
          <div className="space-y-5">
            {data.roundAccuracy.map((r, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-sm font-black text-brand-dark">{r.round}</span>
                    <span className="text-xs font-bold text-gray-400 ml-2">
                      ({r.correct} correct of {r.total} votes)
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">{r.rate}% Solved</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${r.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Mystery Sessions Table */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Mystery Session Telemetry
            </h2>
            <p className="text-xs font-bold text-gray-400">
              Current stage, cast size, claimed characters &amp; voting accuracy per mystery
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="py-3 pr-4">Mystery</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4 text-right">Cast Size</th>
                <th className="py-3 px-4 text-right">Claimed / Assigned</th>
                <th className="py-3 px-4 text-right">Theories Cast</th>
                <th className="py-3 pl-4 text-right">Killer Solve Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {data.sessions.map((s) => (
                <tr key={s.mysteryId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-4 font-black text-brand-dark">
                    <Link
                      href={`/${locale}/play/${s.mysteryId}?host=1`}
                      className="hover:text-brand-pink transition-colors"
                    >
                      {s.title}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-brand-dark">
                      {s.stageLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-600">{s.castCount}</td>
                  <td className="py-3.5 px-4 text-right font-black text-brand-dark">
                    {s.claimedCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-brand-pink">
                    {s.submissionsCount}
                  </td>
                  <td className="py-3.5 pl-4 text-right font-bold">
                    {s.solveRatePercent !== null ? (
                      <span className="text-emerald-600 font-black">{s.solveRatePercent}%</span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
