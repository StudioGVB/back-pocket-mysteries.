import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | Back Pocket Mysteries',
  description: 'Tips, tricks, and stories from the world of interactive mysteries.',
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
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-24">
          <h1 className="text-5xl lg:text-6xl font-black text-slate-900 mb-8">
            The <span className="text-gradient">Gazette</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            Tips, trends, and stories from the world of immersive entertainment.
          </p>
        </div>

        {/* Featured Post */}
        <div className="mb-24">
          <div className="group relative bg-slate-900 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl">
            <div className="flex-1 aspect-video lg:aspect-auto bg-slate-800 flex items-center justify-center p-20">
              <div className="w-full h-full border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-600 font-black uppercase tracking-widest">
                Main Feature Image
              </div>
            </div>
            <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center">
              <span className="inline-block px-4 py-1.5 bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6 w-fit">
                Featured
              </span>
              <h2 className="text-4xl font-bold text-white mb-6 group-hover:text-brand-pink transition-colors">
                The Anatomy of a Perfect Clue
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed font-medium">
                Learn the secrets behind crafting clues that are challenging but fair. A masterclass in mystery design.
              </p>
              <Link href="/blog/anatomy-of-a-clue" className="text-brand-blue font-bold hover:text-white transition-colors flex items-center gap-2">
                Read the Story <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {posts.map((post, i) => (
            <div key={i} className="group flex flex-col">
              <div className="aspect-video bg-slate-100 rounded-[2rem] mb-8 overflow-hidden flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-[10px] group-hover:bg-slate-50 transition-colors">
                Blog Image
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">{post.tag}</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{post.date}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-brand-blue transition-colors">
                {post.title}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-6 flex-grow">
                {post.excerpt}
              </p>
              <Link href={`/blog/${i}`} className="text-sm font-bold text-slate-900 group-hover:text-brand-pink transition-colors">
                Keep Reading
              </Link>
            </div>
          ))}
        </div>
        
        {/* Newsletter CTA */}
        <div className="mt-40 bg-slate-900 rounded-[3rem] p-12 lg:p-24 relative overflow-hidden text-center">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Stay in the loop</h2>
            <p className="text-slate-400 text-lg mb-10 font-medium">Get tips for your next mystery and be the first to know about new themes.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-grow px-8 py-5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
              />
              <button className="px-10 py-5 bg-indigo-600 text-white rounded-full font-bold hover:bg-white hover:text-slate-900 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
