import React from 'react';
import Link from 'next/link';

export default function ServiceMysteriesPage() {
  const mysteries = [
    {
      title: 'The Emerald Heist',
      desc: 'A high-stakes robbery at a prestigious gala. Who among the elite is the thief?',
      difficulty: 'Medium',
      players: '8-12',
      category: 'Noir',
      slug: 'emerald-heist',
      price: '$29'
    },
    {
      title: 'Midnight at Manor',
      desc: 'The patriarch is dead, and the inheritance is up for grabs. A classic whodunnit.',
      difficulty: 'Easy',
      players: '6-10',
      category: 'Classic',
      slug: 'midnight-manor',
      price: '$29'
    }
  ];

  return (
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Available Stories</h1>
          <p className="text-slate-500 font-medium text-lg">Pick a theme and start your journey.</p>
        </div>
        
        <div className="flex gap-4">
          <select className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-pink">
            <option>All Categories</option>
            <option>Noir</option>
            <option>Classic</option>
            <option>Sci-Fi</option>
          </select>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {mysteries.map((theme, i) => (
          <div key={i} className="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col">
            <div className="aspect-video bg-slate-100 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-700">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Mystery Cover</span>
            </div>
            <div className="p-8 flex flex-col flex-grow justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="px-3 py-1 bg-brand-pink/5 text-brand-pink rounded-full text-[10px] font-black uppercase tracking-widest">
                    {theme.category}
                  </span>
                  <span className="text-slate-900 font-black text-xl">{theme.price}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-brand-pink transition-colors">
                  {theme.title}
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                  {theme.desc}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <span>{theme.players} Players</span>
                  <span>{theme.difficulty}</span>
                </div>
                <Link href={`/mysteries/${theme.slug}`} className="block w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-center hover:bg-brand-pink transition-all shadow-lg active:scale-[0.98]">
                  Get This Story
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
