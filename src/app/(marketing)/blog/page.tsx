import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | Back Pocket Mysteries',
  description: 'Tips, tricks, and stories from the world of interactive mysteries. Part of Back Pocket Games.',
};

export default function BlogPage() {
  const posts = [
    {
      title: 'How to Host a 1920s Mystery Party',
      excerpt: 'Everything from costume ideas to the perfect jazz playlist for your noir night.',
      tag: 'Guides',
      date: 'May 12, 2024'
    },
    {
      title: 'Top 5 Themes for Remote Teams',
      excerpt: 'Bored of Zoom happy hours? Try these high-stakes digital mysteries.',
      tag: 'Digital',
      date: 'May 08, 2024'
    },
    {
      title: 'Writing the Perfect Murder Mystery',
      excerpt: 'An interview with our lead story architect on how we craft our twisty plots.',
      tag: 'Inside Look',
      date: 'May 01, 2024'
    }
  ];

  return (
    <div className="py-24 lg:py-48 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            The Latest Stories
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-brand-dark mb-10 tracking-tighter uppercase leading-[0.9]">
            The <br />
            <span className="text-brand-pink italic">Gazette.</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-500 font-bold max-w-xl mx-auto border-l-4 border-brand-pink pl-6 text-left">
            Tips, trends, and stories from the world of immersive entertainment.
          </p>
        </div>

        {/* Featured Post */}
        <div className="mb-32">
          <div className="group relative bg-brand-dark rounded-[4rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl border-8 border-white hover:scale-[1.01] transition-transform duration-500">
            <div className="flex-1 aspect-video lg:aspect-auto bg-brand-gray flex items-center justify-center p-20 animate-pulse">
              <div className="w-full h-full bg-brand-dark rounded-3xl flex items-center justify-center text-white font-black uppercase tracking-[0.2em] text-xs">
                Main Feature
              </div>
            </div>
            <div className="flex-1 p-16 lg:p-24 flex flex-col justify-center">
              <span className="inline-block px-4 py-1.5 bg-brand-pink text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8 w-fit">
                Featured
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-8 group-hover:text-brand-pink transition-colors uppercase tracking-tight leading-[0.9]">
                The Anatomy of <br />
                a Perfect Clue
              </h2>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed font-bold">
                Learn the secrets behind crafting clues that are challenging but fair. A masterclass in mystery design.
              </p>
              <Link href="/blog/anatomy-of-a-clue" className="text-white font-black uppercase tracking-widest text-xs hover:text-brand-pink transition-colors flex items-center gap-4 group/link">
                Read the Story 
                <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover/link:bg-brand-pink group-hover/link:border-brand-pink transition-all">
                   →
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {posts.map((post, i) => (
            <div key={i} className="group card-branded p-12 flex flex-col hover:border-brand-pink">
              <div className="aspect-video bg-brand-gray rounded-3xl mb-10 overflow-hidden flex items-center justify-center text-gray-400 font-black uppercase tracking-widest text-[10px] group-hover:scale-[1.05] transition-transform duration-500">
                Post Art
              </div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">{post.tag}</span>
                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{post.date}</span>
              </div>
              <h3 className="text-3xl font-black text-brand-dark mb-6 group-hover:text-brand-pink transition-colors uppercase tracking-tighter leading-none">
                {post.title}
              </h3>
              <p className="text-gray-500 font-bold leading-relaxed mb-10 flex-grow text-lg">
                {post.excerpt}
              </p>
              <Link href={`/blog/${i}`} className="text-xs font-black uppercase tracking-widest text-brand-dark group-hover:text-brand-pink transition-colors flex items-center gap-2">
                Keep Reading <span className="text-xl">+</span>
              </Link>
            </div>
          ))}
        </div>
        
        {/* Newsletter CTA */}
        <div className="mt-64 bg-brand-dark rounded-[4rem] p-16 lg:p-32 relative overflow-hidden text-center shadow-2xl border-8 border-white">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">
               Stay in <br /><span className="text-brand-pink italic">The Loop.</span>
            </h2>
            <p className="text-gray-400 text-xl lg:text-2xl mb-12 font-bold leading-snug">Get tips for your next mystery and be the first to know about new themes.</p>
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-grow px-8 py-5 rounded-full bg-transparent text-white placeholder:text-gray-500 font-bold focus:outline-none focus:ring-0 transition-all border-none"
              />
              <button className="px-12 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-all shadow-xl active:scale-95">
                Subscribe
              </button>
            </div>
          </div>
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.2)_1px,transparent_1px)] [background-size:32px_32px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

