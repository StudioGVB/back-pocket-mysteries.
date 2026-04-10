import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing | Back Pocket Mysteries',
  description: 'Murder mystery packs from $19. Choose the level of personalisation that suits your event — instant download, print-ready, fully personalised with your guest list.',
};

export default function PricingPage() {
  const tiers = [
    {
      name: 'Basic',
      price: '$19',
      tagline: 'Quick setup, sorted party.',
      desc: 'Best for small groups, casual hosts, or first-timers who want to see what we\'re about.',
      features: [
        '6–10 guests',
        'Theme-based mystery with 4 structured rounds',
        'Guest names inserted throughout the story',
        'Host guide + character packets',
        'Mostly text-based clues (0–4 evidence images)',
        'Print or share digitally',
        'Instant download',
      ],
      cta: 'Get Basic Pack',
      featured: false,
      bestFor: 'Casual dinner parties, friend nights'
    },
    {
      name: 'Premium',
      price: '$33',
      tagline: 'The main event pack.',
      desc: 'Best for birthdays, hens and bucks parties, and "main event" evenings where you want it to feel really special.',
      features: [
        '8–14 guests',
        'Deeper personalisation: guest "vibes" → character motivations & conflict graph',
        '8–12 AI-generated evidence images (texts, DMs, notes, "receipts")',
        'Optional confessional prompts',
        'Host guide + sealed per-guest packets',
        'Print or share digitally',
        'Instant download',
      ],
      cta: 'Get Premium Pack',
      featured: true,
      bestFor: 'Hens nights, milestone birthdays, dinner party showstoppers'
    },
    {
      name: 'Deluxe',
      price: '$49',
      tagline: 'All the drama. All the props.',
      desc: 'Best for high-effort hosts, content creators, or corporate buyers who want everything dialled up to the maximum.',
      features: [
        '10–20 guests',
        'Full relationship web + personalised secrets + tailored red herrings',
        '16–20 AI-generated evidence images + premium props: social posts, "press clippings", photo booth strips, maps',
        'Optional corporate branding layer (logo/colour palette)',
        'Host guide + sealed per-guest packets',
        'Print or share digitally',
        'Instant download',
      ],
      cta: 'Get Deluxe Pack',
      featured: false,
      bestFor: 'Corporate events, content creators, high-effort hosts'
    }
  ];

  const faqs = [
    {
      q: 'Can I still play as the host?',
      a: 'Yes — and that\'s by design. The host guide tells you exactly when to reveal each clue, so you don\'t need to read spoilers in advance. You can play along as a character.'
    },
    {
      q: 'Do I need to print everything?',
      a: 'Nope. You can share character packets and clues digitally, or print at home. Everything comes as formatted PDFs ready for either format.'
    },
    {
      q: 'What if my guest list changes last minute?',
      a: 'Reach out within 24 hours of your download and we\'ll help you re-generate with updated guests. It happens — we\'ve got you.'
    },
    {
      q: 'How long does it actually take?',
      a: 'Under 20 minutes from start to download. Pick a theme, add your guests, and your pack is generated and ready. No waiting, no queue.'
    },
    {
      q: 'Is this suitable for work events?',
      a: 'Yes. Our themes are rated 16+ by default with mature-but-not-offensive content. The Gala Heist and The Inheritance work particularly well for corporate groups — no cringe, no awkward icebreakers.'
    },
    {
      q: 'Can I buy a pack as a gift?',
      a: 'Absolutely. Gift it to the organiser — they add their guest list and download the pack themselves. Perfect present for a birthday or hens night.'
    }
  ];

  return (
    <div className="py-24 lg:py-48 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            Pricing
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-brand-dark mb-10 tracking-tighter uppercase leading-[0.9]">
            One pack. <br />
            <span className="text-brand-pink italic">Your whole night.</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-500 font-bold max-w-2xl mx-auto border-l-4 border-brand-pink pl-6 text-left">
            Pay once per event. No subscriptions, no per-player fees, no hidden extras. Just a complete, personalised mystery pack ready to go.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier, i) => (
            <div key={i} className={`relative p-12 lg:p-14 rounded-[4rem] border-4 flex flex-col group transition-all duration-500 ${tier.featured ? 'bg-brand-dark border-brand-dark shadow-2xl scale-[1.04] z-10' : 'bg-white border-gray-100 hover:border-brand-pink shadow-lg hover:shadow-2xl'}`}>
              {tier.featured && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-brand-pink text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl whitespace-nowrap">
                  Most Popular
                </div>
              )}
              
              <div className="mb-10">
                <h3 className={`text-4xl font-black mb-2 uppercase tracking-tighter ${tier.featured ? 'text-white' : 'text-brand-dark'}`}>{tier.name}</h3>
                <p className={`text-sm font-black uppercase tracking-widest mb-6 ${tier.featured ? 'text-brand-pink' : 'text-gray-400'}`}>{tier.tagline}</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className={`text-7xl font-black tracking-tighter ${tier.featured ? 'text-white' : 'text-brand-dark'}`}>{tier.price}</span>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>/ event</span>
                </div>
                <p className={`font-bold text-base leading-snug ${tier.featured ? 'text-gray-400' : 'text-gray-500'}`}>{tier.desc}</p>
              </div>
              
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>
                Best for: <span className={tier.featured ? 'text-brand-pink' : 'text-brand-dark'}>{tier.bestFor}</span>
              </div>

              <ul className="space-y-5 mb-12 flex-grow">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-4">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-pink flex items-center justify-center text-white text-xs shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-sm font-bold leading-snug ${tier.featured ? 'text-gray-300' : 'text-brand-dark'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/signup" className={`btn-pill w-full py-6 text-center text-sm ${tier.featured ? 'bg-brand-pink text-white hover:bg-white hover:text-brand-pink shadow-2xl' : 'bg-brand-dark text-white hover:bg-brand-pink hover:text-white'}`}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Value anchoring note */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 font-bold text-sm max-w-2xl mx-auto leading-relaxed">
            For context: a custom Etsy mystery kit costs $60–$150+ and takes 3–21 days to arrive. <br />
            A hosted murder mystery event costs $39–$160+ <em>per person</em>. <br />
            We deliver the same wow factor — for your whole group — in under 20 minutes.
          </p>
        </div>
        
        {/* FAQ */}
        <div className="mt-48 pt-32 max-w-5xl mx-auto border-t-2 border-gray-100">
          <div className="text-center mb-24">
             <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">Need <span className="text-brand-pink italic">Answers?</span></h2>
             <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Frequently Asked Questions</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10 text-left">
            {faqs.map((faq, i) => (
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <h4 className="font-black text-brand-dark mb-4 uppercase tracking-tight text-xl group-hover:text-brand-pink transition-colors">{faq.q}</h4>
                <p className="text-gray-500 font-bold text-base leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-40 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tight">
            Still on the fence? <span className="text-brand-pink italic">Don't be.</span>
          </h2>
          <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto mb-12">
            Your party is happening either way. Make it one people actually talk about.
          </p>
          <Link href="/themes" className="inline-block px-14 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-dark transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
            Browse Themes & Build Your Pack
          </Link>
        </div>
      </div>
    </div>
  );
}
