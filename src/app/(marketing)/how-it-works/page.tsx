import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | Back Pocket Mysteries',
  description: 'Learn how to host a perfect mystery night in 3 simple steps.',
};

export default function HowItWorksPage() {
  return (
    <div className="py-20 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-20">
          <h1 className="text-5xl lg:text-6xl font-black text-slate-900 mb-8 tracking-tight">
            Hosting a mystery shouldn't be a <span className="text-indigo-600">mystery itself.</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed font-medium">
            We've distilled years of experience into a simple 3-step process. High production value, zero stress.
          </p>
        </div>
        
        <div className="space-y-32">
          {[
            {
              step: '01',
              title: 'Pick your theme',
              desc: 'Browse our curated collection of mystery templates. Each theme comes with a unique plot, detailed character backgrounds, and professional clue assets.',
              accent: 'bg-indigo-600',
              imageLabel: 'Theme Selection Interface'
            },
            {
              step: '02',
              title: 'Personalize the experience',
              desc: 'Input your guest list and assign roles. Our customization engine weaves their names and relationships directly into the narrative for a truly immersive game.',
              accent: 'bg-emerald-500',
              imageLabel: 'Customization Engine'
            },
            {
              step: '03',
              title: 'Download and play',
              desc: 'Receive your personalized digital package instantly. Print the assets or distribute them digitally. Follow our simple host guide to lead a legendary night.',
              accent: 'bg-amber-500',
              imageLabel: 'Instant Delivery'
            }
          ].map((item, i) => (
            <div key={i} className={`flex flex-col lg:flex-row gap-16 lg:items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <div className={`inline-block px-4 py-1 rounded-full text-white font-bold text-sm ${item.accent} mb-6`}>
                  STEP {item.step}
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-6">{item.title}</h2>
                <p className="text-lg text-slate-500 leading-relaxed font-medium mb-8">
                  {item.desc}
                </p>
                <ul className="space-y-4">
                  {['Professional assets', 'Story-driven clues', 'Host guides included'].map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-700 font-bold">
                      <div className={`w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white`}>✓</div>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="aspect-video bg-slate-100 rounded-[2rem] border border-slate-200 flex items-center justify-center relative overflow-hidden group shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">{item.imageLabel}</span>
                  
                  {/* Decorative "UI" elements */}
                  <div className="absolute top-4 left-4 w-24 h-2 bg-slate-200 rounded-full"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 bg-slate-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Final CTA */}
        <div className="mt-40 text-center bg-indigo-50 rounded-[3rem] p-16 lg:p-24">
          <h2 className="text-4xl font-bold text-slate-900 mb-8">Get Your First Mystery Today</h2>
          <p className="text-lg text-slate-500 mb-12 max-w-xl mx-auto font-medium">
            Start with our most popular theme, "The Emerald Heist," and see how easy hosting can be.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/themes" className="px-10 py-5 bg-brand-blue text-white rounded-full font-bold hover:bg-slate-900 transition-all shadow-xl">
              View All Themes
            </Link>
            <Link href="/signup" className="px-10 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-full font-bold hover:bg-slate-50 transition-all">
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
