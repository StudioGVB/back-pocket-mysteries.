import React from 'react';

export default function SubplotsPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Subplots</h1>
        <p className="text-slate-500 font-medium text-sm">Add intricate layers and secondary objectives to your mystery.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] p-24 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-4">🎭</div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Coming Soon</h3>
        <p className="text-slate-400 font-medium text-sm max-w-sm">
          We're currently building the Subplot editor to help you create complex character arcs and hidden agendas.
        </p>
      </div>
    </div>
  );
}
