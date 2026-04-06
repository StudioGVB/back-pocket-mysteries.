import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
  const tiers = [
    {
      name: 'Starter',
      price: '$19',
      desc: 'Perfect for small groups of friends or family.',
      features: ['Up to 8 Players', '1 Professional Theme', 'Instant Digital Delivery', 'Basic Customization'],
      cta: 'Choose Starter',
      featured: false
    },
    {
      name: 'Pro',
      price: '$29',
      desc: 'Our most popular choice for legendary parties.',
      features: ['Up to 20 Players', 'All Themes Included', 'Advanced Story Builder', 'Mobile Clue Delivery', 'Priority Support'],
      cta: 'Choose Pro',
      featured: true
    },
    {
      name: 'Event',
      price: '$99',
      desc: 'Tailored for corporate retreats and large events.',
      features: ['Unlimited Players', 'White-label Branding', 'Dedicated Event Concierge', 'Custom Theme Design', 'Analytics & Feedback'],
      cta: 'Contact Sales',
      featured: false
    }
  ];

  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-24">
          <h1 className="text-5xl lg:text-6xl font-black text-slate-900 mb-8">
            Simple, Transparent <span className="text-gradient">Pricing</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            Choose the plan that fits your event. No hidden fees, just pure mystery.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <div key={i} className={`relative p-12 rounded-[3.5rem] border flex flex-col group transition-all duration-500 ${tier.featured ? 'bg-slate-900 border-slate-900 shadow-2xl scale-105 z-10' : 'bg-white border-slate-100 hover:border-brand-blue shadow-lg hover:shadow-xl'}`}>
              {tier.featured && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-brand text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-10 text-center lg:text-left">
                <h3 className={`text-2xl font-bold mb-4 ${tier.featured ? 'text-white' : 'text-slate-900'}`}>{tier.name}</h3>
                <div className="flex items-baseline justify-center lg:justify-start gap-1 mb-6">
                  <span className={`text-5xl font-black ${tier.featured ? 'text-white' : 'text-slate-900'}`}>{tier.price}</span>
                  <span className={`text-sm font-bold uppercase tracking-widest ${tier.featured ? 'text-slate-400' : 'text-slate-400'}`}>/ event</span>
                </div>
                <p className={`font-medium ${tier.featured ? 'text-slate-400' : 'text-slate-500'}`}>{tier.desc}</p>
              </div>
              
              <ul className="space-y-5 mb-12 flex-grow">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${tier.featured ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue'}`}>
                      ✓
                    </div>
                    <span className={`text-sm font-bold ${tier.featured ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/signup" className={`w-full py-5 rounded-2xl font-bold text-lg text-center transition-all ${tier.featured ? 'bg-brand-blue text-white hover:bg-brand-pink shadow-xl shadow-brand-blue/20' : 'bg-slate-50 text-slate-900 hover:bg-brand-blue hover:text-white border border-slate-100'}`}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        
        <div className="mt-40 border-t border-slate-100 pt-32 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 text-slate-900">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-12 text-left">
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Can I reuse a theme?</h4>
              <p className="text-slate-500 font-medium">Yes! Once you buy a theme, you can host it as many times as you like for that specific guest list.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-2">What if my guests change?</h4>
              <p className="text-slate-500 font-medium">You can re-customize the names and roles within 24 hours of purchase for free.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
