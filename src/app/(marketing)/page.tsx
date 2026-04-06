import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Back Pocket Games | Unforgettable Interactive Experiences',
  description: 'Hosting a mystery has never been easier. Choose a theme, customize the clues, and start your adventure today.',
};

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-52 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-widest uppercase text-brand-pink bg-brand-pink/5 rounded-full">
              The Future of Party Games
            </div>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Unforgettable adventures, <span className="text-gradient">delivered to your pocket.</span>
            </h1>
            <p className="text-xl lg:text-2xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
              Everything you need to host a thrilling interactive game for your friends, family, or team. Fast, fun, and fully customizable.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/themes" className="px-10 py-5 bg-brand-blue text-white rounded-full font-bold text-lg hover:bg-brand-pink transition-all shadow-xl hover:shadow-brand-blue/20 hover:translate-y-[-2px] active:translate-y-[0px]">
                Browse All Themes
              </Link>
              <Link href="/how-it-works" className="px-10 py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-full font-bold text-lg hover:bg-slate-50 transition-all hover:translate-y-[-2px] active:translate-y-[0px]">
                How it Works
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-pink/5 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl opacity-60"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-50 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Host the Perfect Mystery Night</h2>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">Three simple steps to transform your next gathering into an legendary event.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                emoji: '✨',
                title: 'Choose Your Theme',
                desc: 'From 1920s heists to futuristic espionage, find the perfect setting for your mystery.',
                color: 'bg-brand-pink/5 text-brand-pink'
              },
              {
                emoji: '📝',
                title: 'Customize Clues',
                desc: 'Personalize guest names, inside jokes, and relationship dynamics to make it yours.',
                color: 'bg-emerald-50 text-emerald-600'
              },
              {
                emoji: '🚀',
                title: 'Instantly Play',
                desc: 'Receive your digital files instantly and start your adventure within minutes.',
                color: 'bg-brand-blue/5 text-brand-blue'
              }
            ].map((feature, i) => (
              <div key={i} className="p-10 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group hover:translate-y-[-4px]">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.emoji}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-24 text-center relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8">Ready to start the game?</h2>
              <p className="text-slate-400 text-xl lg:text-2xl mb-12 font-medium">Join thousands of hosts creating unforgettable experiences worldwide.</p>
              <Link href="/signup" className="inline-block px-12 py-6 bg-brand-blue text-white rounded-full font-bold text-xl hover:bg-brand-pink transition-all shadow-2xl">
                Get Started for Free
              </Link>
            </div>
            
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(#ff00ff_1px,transparent_1px)] [background-size:40px_40px]"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
