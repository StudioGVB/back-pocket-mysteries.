import React from 'react';

export default function CompilePage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Compile & Publish</h1>
        <p className="text-slate-500 font-medium text-sm">Package your mystery into a playable format and share it with the world.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-6">📦</div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 text-left w-full border-b pb-4">Package Readiness</h3>
            <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Characters</span>
                    <span className="text-sm font-black text-emerald-500">READY</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Relationships</span>
                    <span className="text-sm font-black text-emerald-500">READY</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Timeline</span>
                    <span className="text-sm font-black text-emerald-500">READY</span>
                </div>
                 <div className="flex items-center justify-between opacity-50">
                    <span className="text-sm font-bold text-slate-600">Subplots</span>
                    <span className="text-sm font-black text-slate-400">PENDING</span>
                </div>
            </div>
            
            <button className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-blue transition-all disabled:opacity-50" disabled>
                Compile Pack
            </button>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-sm flex flex-col justify-center">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">Sharing Options</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">
                Once compiled, you'll be able to download your printable PDF pack and host interactive sessions online.
            </p>
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Publish Status</p>
                <p className="text-sm font-bold text-white tracking-tight">Your story is currently a work in progress.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
