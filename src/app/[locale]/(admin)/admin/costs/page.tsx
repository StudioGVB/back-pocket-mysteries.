import React, { Suspense } from 'react';
import { getAdminStats, getAiCosts, getLiveAiProviderStatus } from '../admin-data';

export const unstable_instant = false;

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function VolumeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function ImageSvgIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export default async function CostsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Cost Tracking</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Live Google Gemini / Imagen API &amp; ElevenLabs usage, official token/image pricing, and revenue comparison.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://aistudio.google.com/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Google AI Studio Billing
            <ExternalLinkIcon />
          </a>
          <a
            href="https://elevenlabs.io/app/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            ElevenLabs Billing
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      <Suspense fallback={<AdminCostsSkeleton />}>
        <AdminCostsContent />
      </Suspense>
    </div>
  );
}

async function AdminCostsContent() {
  const [stats, logs, providerStatus] = await Promise.all([
    getAdminStats(),
    getAiCosts(),
    getLiveAiProviderStatus(),
  ]);

  const totalRevenue = stats.totalRevenue;

  // Separate Google API vs ElevenLabs costs
  const googleLogs = logs.filter((l) => !l.model_name.startsWith('elevenlabs:'));
  const elevenLogs = logs.filter((l) => l.model_name.startsWith('elevenlabs:'));

  const googleCost = googleLogs.reduce((acc, log) => acc + Number(log.cost_usd || 0), 0);
  const elevenCost = elevenLogs.reduce((acc, log) => acc + Number(log.cost_usd || 0), 0);
  const totalAiCost = googleCost + elevenCost;

  const googleImageLogs = googleLogs.filter(
    (l) => l.model_name.includes('image') || l.model_name.includes('imagen')
  );
  const googleTextLogs = googleLogs.filter(
    (l) => !l.model_name.includes('image') && !l.model_name.includes('imagen')
  );

  const profitMargin =
    totalRevenue > 0 ? ((totalRevenue - totalAiCost) / totalRevenue) * 100 : 0;

  const { googleStatus, elevenStatus } = providerStatus;
  const charPct =
    elevenStatus.characterLimit > 0
      ? Math.min(100, (elevenStatus.characterCount / elevenStatus.characterLimit) * 100)
      : 0;

  return (
    <>
      {/* Top KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Total Revenue
          </h2>
          <div className="text-4xl font-black text-green-600">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-2 font-medium">From completed orders</p>
        </div>

        {/* Google API Spend Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Google API Cost
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {googleLogs.length} calls
            </span>
          </div>
          <div className="text-4xl font-black text-red-500">${googleCost.toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {googleImageLogs.length} images ($0.04/ea) · {googleTextLogs.length} text gens
          </p>
        </div>

        {/* Total AI Cost Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Total AI Cost
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {logs.length} total
            </span>
          </div>
          <div className="text-4xl font-black text-red-500">${totalAiCost.toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Google ${googleCost.toFixed(2)} + ElevenLabs ${elevenCost.toFixed(2)}
          </p>
        </div>

        {/* Profit Margin Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Net Profit
          </h2>
          <div className="text-4xl font-black text-slate-900">
            ${(totalRevenue - totalAiCost).toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {profitMargin.toFixed(1)}% margin on AI usage
          </p>
        </div>
      </div>

      {/* Live API Provider Status Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Gemini & Imagen Live Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Google Gemini &amp; Imagen API
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Key: {googleStatus.maskedKey}
                </p>
              </div>
            </div>
            {googleStatus.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                <CheckCircleIcon />
                Live ({googleStatus.modelsCount} models)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                <AlertCircleIcon />
                {googleStatus.error || 'Disconnected'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-bold uppercase text-[10px]">
                gemini-2.5-flash-image
              </div>
              <div className="text-slate-900 font-black text-sm mt-1">$0.04 / image</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                {googleImageLogs.length} images (${(googleImageLogs.length * 0.039).toFixed(2)})
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-bold uppercase text-[10px]">
                gemini-2.5-flash
              </div>
              <div className="text-slate-900 font-black text-sm mt-1">$0.30 / $2.50 1M</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Input / Output tokens</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-bold uppercase text-[10px]">
                gemini-2.5-pro
              </div>
              <div className="text-slate-900 font-black text-sm mt-1">$1.25 / $10.00 1M</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Input / Output tokens</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Connected directly to <code className="text-slate-600">generativelanguage.googleapis.com</code> using your{' '}
            <code className="text-slate-600">GOOGLE_GENERATIVE_AI_API_KEY</code>. Every Gemini &amp; image generation call
            extracts exact <code className="text-slate-600">usageMetadata</code> token/image counts and calculates your charge at
            official Google AI Studio Paid Tier rates.
          </p>
        </div>

        {/* ElevenLabs Voice API Live Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <VolumeIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  ElevenLabs Voice API ({elevenStatus.tier.toUpperCase()})
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Key: {elevenStatus.maskedKey}
                </p>
              </div>
            </div>
            {elevenStatus.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                <CheckCircleIcon />
                Live Subscription
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                <AlertCircleIcon />
                {elevenStatus.error || 'Disconnected'}
              </span>
            )}
          </div>

          {elevenStatus.connected && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Monthly Character Quota</span>
                <span className="font-black text-slate-900">
                  {elevenStatus.characterCount.toLocaleString()} /{' '}
                  {elevenStatus.characterLimit.toLocaleString()} chars ({charPct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${Math.max(2, charPct)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">
                    Usage Value
                  </div>
                  <div className="text-slate-900 font-black text-sm mt-1">
                    ${elevenCost.toFixed(2)}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {elevenLogs.length} audio batches
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">
                    Current Overage
                  </div>
                  <div className="text-slate-900 font-black text-sm mt-1">
                    ${elevenStatus.overageUsd.toFixed(2)}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Extra charges</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">
                    Next Invoice
                  </div>
                  <div className="text-slate-900 font-black text-sm mt-1">
                    ${(elevenStatus.nextInvoiceCents / 100).toFixed(2)}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Plan renewal</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              AI Generation &amp; API Charge Logs ({logs.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Includes live logged requests, discovered Google Gemini/Imagen assets, and ElevenLabs synthesis history.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Feature</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4">Usage / Tokens</th>
                <th className="px-6 py-4 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No AI usage logs found.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 100).map((log) => {
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(log.created_at));

                  const isEleven = log.model_name.startsWith('elevenlabs:');
                  const isImage =
                    log.model_name.includes('image') || log.model_name.includes('imagen');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEleven ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700">
                            <VolumeIcon className="w-3 h-3" />
                            ElevenLabs
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                            {isImage ? (
                              <ImageSvgIcon className="w-3 h-3" />
                            ) : (
                              <SparklesIcon className="w-3 h-3" />
                            )}
                            Google AI
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 capitalize">
                        {log.feature_name.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {log.model_name.replace('elevenlabs:', '')}
                      </td>
                      <td className="px-6 py-4">
                        {isEleven ? (
                          <span className="text-xs text-slate-500">
                            <span className="text-slate-800 font-bold">{log.prompt_tokens}</span> chars
                            {log.completion_tokens ? ` · ${log.completion_tokens} lines` : ''}
                          </span>
                        ) : isImage ? (
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md">
                            1 Image ({log.completion_tokens || 1290} img tokens)
                          </span>
                        ) : log.prompt_tokens ? (
                          <span className="text-xs text-slate-500">
                            <span className="text-slate-800 font-bold">{log.prompt_tokens}</span> in /{' '}
                            <span className="text-slate-800 font-bold">{log.completion_tokens}</span> out
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                            API Call
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-red-500">
                        ${Number(log.cost_usd).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AdminCostsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-6 h-28 flex flex-col justify-center space-y-2"
          >
            <div className="h-3 bg-slate-100 rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-slate-100 rounded w-24 animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-64 w-full animate-pulse"></div>
    </div>
  );
}
