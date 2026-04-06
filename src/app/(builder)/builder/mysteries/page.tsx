import React from 'react';

export default function BuilderMysteriesPage() {
  const mysteries = [
    { title: 'The Emerald Heist', status: 'Published', lastEdited: '2 days ago', players: '8-12' },
    { title: 'Midnight at Manor', status: 'Draft', lastEdited: '5 hours ago', players: '6-10' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Your Mysteries</h1>
          <p className="text-slate-500 font-medium text-sm">Manage and edit your interactive experiences.</p>
        </div>
        <button className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-lg shadow-brand-blue/10">
          + Create New Mystery
        </button>
      </div>
      
      <div className="grid gap-6">
        {mysteries.map((mystery, i) => (
          <div key={i} className="bg-white border border-slate-100 p-8 rounded-[2rem] flex items-center justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🎭
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-brand-pink transition-colors">{mystery.title}</h3>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{mystery.players} Players</span>
                  <span>•</span>
                  <span>Edited {mystery.lastEdited}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mystery.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {mystery.status}
              </span>
              <button className="px-5 py-2 hover:bg-brand-pink/10 rounded-xl text-sm font-bold text-slate-600 hover:text-brand-pink transition-all">
                Edit
              </button>
            </div>
          </div>
        ))}
        
        {/* Placeholder for empty state or more items */}
        <div className="border-2 border-dashed border-slate-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center opacity-50">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl mb-4">✨</div>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">New template slot available</p>
        </div>
      </div>
    </div>
  );
}
