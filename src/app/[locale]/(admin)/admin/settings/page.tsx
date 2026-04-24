import React from 'react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
          Platform <span className="text-brand-pink italic">Settings</span>
        </h1>
        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
          Global configurations, SEO, and Integrations
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <p className="font-bold mb-1">Database Integration Pending</p>
          <p className="text-sm">These settings are currently static placeholders. A dedicated settings table or configuration service needs to be implemented in the backend before these values can be saved.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-75">
        {/* Global Settings */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-black text-brand-dark mb-6">Global Defaults</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Base Price (Basic Mystery)</label>
              <input type="text" disabled defaultValue="$49.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Support Email Address</label>
              <input type="email" disabled defaultValue="Hello@backpocketgames.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500" />
            </div>
            <button disabled className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl opacity-50 cursor-not-allowed">
              Save Global Settings
            </button>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-black text-brand-dark mb-6">SEO Management</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Default Site Title</label>
              <input type="text" disabled defaultValue="Back Pocket Mysteries | Custom Murder Mystery Games" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Default Meta Description</label>
              <textarea disabled rows={3} defaultValue="Host an unforgettable evening with a custom-crafted murder mystery..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500"></textarea>
            </div>
            <button disabled className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl opacity-50 cursor-not-allowed">
              Save SEO Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
