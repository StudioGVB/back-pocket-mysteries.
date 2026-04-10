import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | Back Pocket Mysteries',
  description: 'From guest list to print-ready murder mystery pack in under 20 minutes. Here\'s exactly how Back Pocket Mysteries works.',
};

export default function HowItWorksPage() {
  return (
    <div className="py-20 lg:py-32 bg-white">
      <div className="container mx-auto px-6">

        {/* Page Header */}
        <div className="max-w-3xl mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            The Process
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.95]">
            Your party sorted<br />
            <span className="text-brand-pink italic">in under 20 minutes.</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
            You've got enough on your plate. We handle the script, the evidence, the character packets, and the host guide — all personalised to your actual guest list. You just show up and play.
          </p>
        </div>
        
        {/* Steps */}
        <div className="space-y-32">
          {[
            {
              step: '01',
              title: 'Pick a theme that fits your crowd',
              desc: 'Browse our themes and pick the one that matches your event energy. Chaotic celebrity drama? Vintage murder at the manor? Toxic 20s? Every theme comes with a full plot, structured rounds, and a final reveal — all designed to run itself.',
              bullets: [
                'Themes for every vibe — classic, modern, chaotic, corporate-safe',
                'Rated 16+ by default; suitable for mature friend groups & work events',
                'New themes added regularly — great for recurring game nights',
              ],
              accent: 'bg-brand-pink',
              accentText: 'text-brand-pink',
              imageLabel: 'Theme Selection'
            },
            {
              step: '02',
              title: 'Tell us who\'s coming',
              desc: 'This is where the magic happens. Add your guests\' names and their relationships to each other — old friends, exes, coworkers, the messy ones. The more context you give, the better the mystery. Our AI engine builds a full conflict graph and weaves your people into every clue, motive, and confession.',
              bullets: [
                'Guest names appear throughout the story, clues, and evidence',
                'Relationship dynamics shape character motivations and red herrings',
                'Even the host can play — no spoilers required to run the game',
              ],
              accent: 'bg-brand-blue',
              accentText: 'text-brand-blue',
              imageLabel: 'Guest Personalisation'
            },
            {
              step: '03',
              title: 'Download your complete pack',
              desc: 'In under 20 minutes, your personalised murder mystery pack is ready. Print at home or share digitally with guests. Everything is included — no separate downloads, no missing pieces, no design tools required.',
              bullets: [
                'Host guide runs the evening — no improv required',
                'Per-guest character packets (sealed — no spoilers)',
                'Round-by-round clue drops + AI-generated evidence images',
                'Printable or digital — works for in-person and hybrid groups',
              ],
              accent: 'bg-emerald-500',
              accentText: 'text-emerald-500',
              imageLabel: 'Pack Download'
            }
          ].map((item, i) => (
            <div key={i} className={`flex flex-col lg:flex-row gap-16 lg:items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <div className={`inline-block px-4 py-1 rounded-full text-white font-bold text-sm ${item.accent} mb-6`}>
                  STEP {item.step}
                </div>
                <h2 className="text-4xl font-black text-brand-dark mb-6 uppercase tracking-tight leading-[1.1]">{item.title}</h2>
                <p className="text-lg text-gray-500 leading-relaxed font-medium mb-8">
                  {item.desc}
                </p>
                <ul className="space-y-4">
                  {item.bullets.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-brand-dark font-bold">
                      <div className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}>✓</div>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="aspect-video bg-brand-gray rounded-[2rem] border-2 border-gray-100 flex items-center justify-center relative overflow-hidden group shadow-inner hover:border-brand-pink transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-gray-300 font-black tracking-widest uppercase text-xs">{item.imageLabel}</span>
                  {/* Decorative UI elements */}
                  <div className="absolute top-4 left-4 w-24 h-2 bg-gray-200 rounded-full"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="absolute top-8 right-8 w-8 h-8 bg-brand-pink/20 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* What's In The Pack */}
        <div className="mt-48 py-20 px-12 lg:px-24 bg-brand-gray rounded-[3rem] border-2 border-gray-100">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-4 uppercase tracking-tight">
              What's in <span className="text-brand-pink italic">the pack?</span>
            </h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto">Everything you need to run a seamless, memorable night — all formatted, all personalised, all in one download.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Host Guide', desc: 'Step-by-step facilitation script that runs the night. You don\'t need to memorise anything.' },
              { title: 'Character Packets', desc: 'Sealed per-guest envelopes with their role, backstory, and secret. Keeps guests in the dark until the right moment.' },
              { title: 'Round-by-Round Clue Drops', desc: 'Structured reveals across 4 rounds that build tension and keep everyone guessing.' },
              { title: 'AI Evidence Images', desc: 'Fake texts, DM screenshots, "receipts", and handwritten notes — all generated with your guests\' names in them.' },
              { title: 'Final Reveal Script', desc: 'A satisfying, dramatic conclusion. The murderer is exposed. Chaos ensues.' },
              { title: 'Print or Digital Ready', desc: 'All documents are formatted to print at home or share as PDFs. No design skills, no extra tools.' },
            ].map((item, i) => (
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <div className="w-10 h-10 bg-brand-pink rounded-xl mb-6 group-hover:scale-110 transition-transform"></div>
                <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-3">{item.title}</h3>
                <p className="text-gray-500 font-semibold leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Persona callouts */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-4 uppercase tracking-tight">
              Made for <span className="text-brand-pink italic">real hosts.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                persona: 'The Main Character Host',
                quote: '"I want to throw a party people actually remember — without spending a week planning it."',
                ideal: 'Birthdays, hens nights, "girls dinner" events',
                highlight: 'The host can play along — you don\'t have to read the whole script in advance.'
              },
              {
                persona: 'The Time-Poor Planner',
                quote: '"I need something impressive that fits between work calls and the school run."',
                ideal: 'Last-minute bookings, busy schedules',
                highlight: 'Ready in under 20 minutes. Instant download. Zero waiting.'
              },
              {
                persona: 'The Corporate Culture Lead',
                quote: '"I need an activity everyone can join in with — no awkward icebreakers."',
                ideal: 'EOFY parties, offsite days, team onboarding',
                highlight: 'HR-friendly content settings. Inclusive by design. Invoice-friendly checkout.'
              },
            ].map((p, i) => (
              <div key={i} className="card-branded p-12 group hover:border-brand-pink flex flex-col">
                <p className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">{p.persona}</p>
                <p className="text-gray-400 italic font-medium text-lg mb-6 leading-relaxed flex-grow">{p.quote}</p>
                <div className="border-t border-gray-100 pt-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Best for</p>
                  <p className="font-bold text-brand-dark text-sm">{p.ideal}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-pink/10 rounded-full">
                    <span className="w-1.5 h-1.5 bg-brand-pink rounded-full"></span>
                    <span className="text-brand-pink font-black text-[10px] uppercase tracking-widest">{p.highlight}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-40 text-center bg-brand-dark rounded-[3rem] p-16 lg:p-24 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.95]">
              Ready to build <br /><span className="text-brand-pink italic">your mystery?</span>
            </h2>
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-bold">
              Pick a theme, add your guests, and download your personalised pack. From $19. Takes less time than choosing a restaurant.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/themes" className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95">
                Browse Themes
              </Link>
              <Link href="/pricing" className="px-10 py-5 bg-white/10 text-white border-2 border-white/20 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95">
                See Pricing
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px]"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
