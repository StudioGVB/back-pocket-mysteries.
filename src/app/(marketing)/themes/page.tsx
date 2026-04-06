import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mystery Themes | Back Pocket Mysteries',
  description: 'Explore our collection of professionally crafted interactive mystery themes.',
};

export default function ThemesPage() {
  const themes = [
    {
      title: 'The Emerald Heist',
      desc: 'A high-stakes robbery at a prestigious gala. Who among the elite is the thief?',
      difficulty: 'Medium',
      players: '8-12',
      category: 'Noir',
      slug: 'emerald-heist',
      accent: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'Midnight at Manor',
      desc: 'The patriarch is dead, and the inheritance is up for grabs. A classic whodunnit.',
      difficulty: 'Easy',
      players: '6-10',
      category: 'Classic',
      slug: 'midnight-manor',
      accent: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Nebula Station Beta',
      desc: 'Sci-fi espionage on a remote space station. Trust no one in zero gravity.',
      difficulty: 'Hard',
      players: '10-15',
      category: 'Sci-Fi',
      slug: 'nebula-station',
      accent: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'Jazz Age Jeopardy',
      desc: '1920s speakeasy mystery filled with music, mobsters, and a missing singer.',
      difficulty: 'Medium',
      players: '8-14',
      category: 'Historical',
      slug: 'jazz-age',
      accent: 'bg-rose-50 text-rose-600'
    }
  ];

  return (
    <div className="py-20 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-20">
          <h1 className="text-5xl lg:text-6xl font-black text-slate-900 mb-8 tracking-tight">
            Infinite worlds, <span className="text-indigo-600">one click away.</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed font-medium">
            Every theme is professionally written and tested to ensure a balanced, thrilling experience for every guest.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-10">
          {themes.map((theme, i) => (
            <Link key={i} href={`/themes/${theme.slug}`} className="group relative bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row h-full">
              <div className="md:w-2/5 aspect-square md:aspect-auto bg-slate-100 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-700">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Theme Art</span>
              </div>
              <div className="md:w-3/5 p-8 lg:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex gap-3 mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${theme.accent}`}>
                      {theme.category}
                    </span>
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {theme.difficulty}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors">
                    {theme.title}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                    {theme.desc}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    {theme.players} Players
                  </span>
                  <span className="text-indigo-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                    Explore Theme <span>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Suggestion CTA */}
        <div className="mt-40 text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Can't find the perfect theme?</p>
          <Link href="/contact" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-indigo-600 transition-all">
            Request a Custom Story
            <span className="text-xl">✍️</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
