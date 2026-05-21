'use client';

import React, { useActionState, useState } from 'react';
import { updatePublishingAction } from './actions';

interface PublishingFormProps {
  mystery: {
    id: string;
    status: string;
    title: string;
    sale_enabled?: boolean;
    sale_label?: string | null;
    sale_discount_pct?: number | null;
    sale_ends_at?: string | null;
  };
}

const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: 'Draft',
    desc: 'Only visible to you. Not available for purchase.',
    dot: 'bg-slate-400',
    ring: 'ring-slate-400',
    text: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    activeBg: 'bg-slate-900 border-slate-900',
    activeText: 'text-white',
  },
  {
    value: 'published',
    label: 'Live',
    desc: 'Publicly visible and available to purchase.',
    dot: 'bg-green-400',
    ring: 'ring-green-400',
    text: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    activeBg: 'bg-green-600 border-green-600',
    activeText: 'text-white',
  },
  {
    value: 'archived',
    label: 'Archived',
    desc: 'Hidden from the public. Existing buyers retain access.',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-500 border-amber-500',
    activeText: 'text-white',
  },
];

export function PublishingForm({ mystery }: PublishingFormProps) {
  const boundAction = updatePublishingAction.bind(null, mystery.id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  const [selectedStatus, setSelectedStatus] = useState(mystery.status || 'draft');
  const [saleEnabled, setSaleEnabled] = useState(mystery.sale_enabled ?? false);

  return (
    <form action={formAction} className="space-y-8">
      {/* Status Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Visibility Status</h2>
          <p className="text-xs text-slate-400 mt-1">Control whether this mystery is publicly available.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_OPTIONS.map(opt => {
            const isActive = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedStatus(opt.value)}
                className={`relative flex flex-col gap-2 p-5 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? `${opt.activeBg} ${opt.activeText} shadow-md`
                    : `${opt.bg} hover:shadow-sm`
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white/80' : opt.dot}`} />
                  <span className={`text-sm font-black uppercase tracking-widest ${isActive ? opt.activeText : opt.text}`}>
                    {opt.label}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {opt.desc}
                </p>
                {isActive && (
                  <span className="absolute top-3 right-3 text-white text-sm">✓</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Hidden input carrying the selected status value */}
        <input type="hidden" name="status" value={selectedStatus} />
      </div>

      {/* Sale Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sale / Promotion</h2>
            <p className="text-xs text-slate-400 mt-1">Run a time-limited discount on this mystery.</p>
          </div>
          {/* Toggle */}
          <button
            type="button"
            onClick={() => setSaleEnabled(!saleEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              saleEnabled ? 'bg-brand-pink' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                saleEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <input type="hidden" name="sale_enabled" value={saleEnabled.toString()} />
        </div>

        {saleEnabled ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Sale Label
              </label>
              <input
                type="text"
                name="sale_label"
                defaultValue={mystery.sale_label ?? ''}
                placeholder="e.g. Summer Sale, Launch Offer"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Discount %
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="sale_discount_pct"
                  defaultValue={mystery.sale_discount_pct ?? ''}
                  min={1}
                  max={90}
                  placeholder="e.g. 20"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50 pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Sale Ends At
              </label>
              <input
                type="datetime-local"
                name="sale_ends_at"
                defaultValue={mystery.sale_ends_at ? mystery.sale_ends_at.slice(0, 16) : ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50"
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            Toggle the switch above to configure a sale or promotional discount.
          </div>
        )}
      </div>

      {/* Save Button & Feedback */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>

        {state?.success && (
          <span className="text-sm text-green-600 font-bold flex items-center gap-1.5">
            <span>✓</span> Changes saved
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-500 font-bold">
            Error: {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
