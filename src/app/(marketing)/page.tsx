import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Back Pocket Mysteries | AI-Personalised Murder Mystery Packs',
  description: 'Your guest list. Your relationships. Your drama — woven into a print-ready murder mystery pack in under 20 minutes. Perfect for birthdays, hens parties, and team nights.',
};

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-40">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
                <span className="w-2 h-2 bg-brand-pink rounded-full animate-pulse"></span>
                Your party, sorted in 20 minutes
              </div>
              <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-brand-dark mb-8 leading-[0.9] uppercase">
                Murder mystery,<br />
                <span className="text-brand-pink italic">built around</span> <br />
                your people.
              </h1>
              <p className="text-xl lg:text-2xl text-gray-500 mb-12 leading-relaxed font-medium">
                Real names. Real relationships. Real drama.{' '}
                <span className="text-brand-dark font-bold">We generate a fully personalised, print-ready murder mystery pack — in minutes, not days.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/themes" className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-dark transition-all shadow-2xl shadow-brand-pink/20 hover:translate-y-[-4px] active:scale-95 text-center">
                  Pick a Theme
                </Link>
                <Link href="/how-it-works" className="px-10 py-5 bg-white text-brand-dark border-2 border-gray-100 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95 text-center">
                  How it Works
                </Link>
              </div>
              <p className="mt-8 text-sm text-gray-400 font-bold">From $19 · Instant download · No hosting required</p>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-brand rounded-[40px] opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
              <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-500">
                <Image 
                  src="/hero-mystery.png" 
                  alt="A print-ready murder mystery pack personalised with your guests' names" 
                  width={800} 
                  height={800}
                  className="w-full aspect-square object-cover"
                  priority
                />
              </div>
              {/* Badge */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-pink rounded-full flex items-center justify-center text-white font-black uppercase text-[9px] tracking-widest rotate-12 shadow-xl border-4 border-white animate-bounce pointer-events-none text-center leading-tight p-2">
                Ready in &lt;20 min
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-6 bg-brand-dark border-y-4 border-brand-pink overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            {['Birthdays', 'Hens & Bucks Nights', 'Dinner Parties', 'Corporate Team Days', 'Friend Group Traditions', 'Engagement Parties'].map((occ, i) => (
              <span key={i} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-brand-pink rounded-full"></span>
                {occ}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Why It's Different Section */}
      <section className="py-32 bg-brand-gray relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-pink/5 skew-x-12 translate-x-1/2"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              Not just a kit. <span className="text-brand-pink">Your</span> kit.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-bold text-lg px-4 border-l-4 border-brand-pink text-left">
              Every other mystery pack gives you a fixed story with blank spaces to fill in. We generate the whole thing around your actual guest list — names, relationships, and all the drama — so every clue, character, and confession feels like it was written just for your party.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Guest-Specific Story',
                desc: 'Tell us who\'s coming and their relationships to each other. We weave real names, dynamics, and "vibes" directly into the narrative, character motivations, and conflict graph.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                badge: 'Personalised'
              },
              {
                title: 'Real Evidence Images',
                desc: 'Fake texts, DM screenshots, handwritten notes, "receipts" — all generated to match your story. Not stock images. Not blank placeholders. Evidence that actually names your guests.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                badge: 'AI-Generated'
              },
              {
                title: 'Print-Ready in Minutes',
                desc: 'Download your complete pack — host guide, character packets, round-by-round clue drops, and evidence assets — all formatted and ready to print or share digitally. No design skills needed.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                badge: 'Instant Download'
              }
            ].map((feature, i) => (
              <div key={i} className="card-branded p-12 hover:border-brand-pink group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center group-hover:bg-brand-pink transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink bg-brand-pink/10 px-3 py-1.5 rounded-full">{feature.badge}</span>
                </div>
                <h3 className="text-2xl font-black mb-4 text-brand-dark uppercase tracking-tight">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed font-semibold">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Quick Preview */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
                Your party is <span className="text-brand-pink italic">sorted</span> in 3 steps.
              </h2>
              <p className="text-gray-400 font-black uppercase tracking-[0.15em] text-xs">No planning. No stress. No spoilers for the host.</p>
            </div>
            <div className="space-y-6">
              {[
                { num: '01', title: 'Pick a theme that fits your crowd', desc: 'Celebrity gossip scandal? 1920s speakeasy? Toxic ex drama? Choose the vibe — we handle the rest.' },
                { num: '02', title: 'Tell us who\'s coming', desc: 'Add your guest names and their relationships to each other. The more detail you give, the funnier and more personal the mystery gets.' },
                { num: '03', title: 'Download and play', desc: 'Your complete, print-ready pack is ready in under 20 minutes. Share digitally or print at home. The host guide runs itself — you can even play along.' },
              ].map((step, i) => (
                <div key={i} className="card-branded p-10 lg:p-14 flex gap-10 items-start group hover:border-brand-pink">
                  <span className="text-7xl lg:text-8xl font-black text-gray-100 leading-none group-hover:text-brand-pink/20 transition-colors shrink-0">{step.num}</span>
                  <div>
                    <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-3">{step.title}</h3>
                    <p className="text-gray-500 font-semibold text-lg leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-16">
              <Link href="/how-it-works" className="inline-flex items-center gap-3 text-brand-pink font-black uppercase tracking-widest text-sm hover:gap-5 transition-all">
                See the full process
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions Section */}
      <section className="py-32 bg-brand-gray">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              Perfect for every <span className="text-brand-pink italic">occasion.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Birthdays', desc: 'The ultimate upgrade from dinner and drinks. Make the birthday person the centre of the mystery.', emoji: '🎂' },
              { title: 'Hens & Bucks Nights', desc: 'Way more fun than a generic package. Your squad, your drama, your mystery.', emoji: '💍' },
              { title: 'Dinner Parties', desc: 'Turn a regular get-together into a night your group talks about for months.', emoji: '🍷' },
              { title: 'Corporate Team Days', desc: 'Gets everyone talking. Inclusive by design, HR-friendly content, no cringe.', emoji: '💼' },
              { title: 'Friend Group Traditions', desc: 'New theme every time. Perfect for recurring game nights or annual gatherings.', emoji: '🎲' },
              { title: 'Engagement Parties', desc: 'Celebrate the couple with a mystery built around their story and their people.', emoji: '🥂' },
            ].map((occ, i) => (
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <div className="text-4xl mb-6">{occ.emoji}</div>
                <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-3 group-hover:text-brand-pink transition-colors">{occ.title}</h3>
                <p className="text-gray-500 font-semibold leading-relaxed">{occ.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Compare Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              Etsy takes weeks. <br /><span className="text-brand-pink italic">We take 20 minutes.</span>
            </h2>
            <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto">The same level of personalisation — without the wait, the Canva faff, or the £150 price tag.</p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border-2 border-gray-100 shadow-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-dark text-white">
                  <th className="py-6 px-8 text-left font-black uppercase tracking-widest text-[10px]">Feature</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-brand-pink">Back Pocket Mysteries</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-gray-400">Etsy Custom Kits</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-gray-400">Generic AI Tools</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Guest names in the story', '✓', '✓ (slow)', '✓ (basic)'],
                  ['AI-generated evidence images', '✓', '✗', '✗'],
                  ['Print-ready pack, all documents', '✓', 'Varies', 'Rarely'],
                  ['Delivery time', '< 20 min', '3–21 days', 'Minutes, but low quality'],
                  ['Price (6–12 guests)', 'From $19', '$60–$150+', '$10–$16'],
                  ['Host plays along too', '✓', 'Depends', '✗'],
                ].map(([feat, bpm, etsy, ai], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-gray'}>
                    <td className="py-5 px-8 font-bold text-brand-dark">{feat}</td>
                    <td className="py-5 px-8 text-center font-black text-brand-pink">{bpm}</td>
                    <td className="py-5 px-8 text-center text-gray-400 font-semibold">{etsy}</td>
                    <td className="py-5 px-8 text-center text-gray-400 font-semibold">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-brand-dark rounded-[3rem] p-12 lg:p-32 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">
                Your party <br />
                <span className="text-brand-pink italic">deserves better</span><br/>
                than a blank template.
              </h2>
              <p className="text-gray-400 text-xl lg:text-2xl mb-4 font-bold max-w-xl mx-auto">
                Get a mystery that's actually about your people. Packs from $19 — instant download, no design skills needed.
              </p>
              <p className="text-gray-500 text-sm font-bold mb-12 uppercase tracking-widest">Rated 16+ · UK, US & AU friendly · Print or share digitally</p>
              <Link href="/themes" className="inline-block px-14 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
                Build Your Mystery
              </Link>
            </div>
            
            {/* Background design */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.1)_1px,transparent_0)] [background-size:24px_24px]"></div>
               <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-pink rounded-full blur-[120px] opacity-20"></div>
               <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue rounded-full blur-[120px] opacity-20"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
