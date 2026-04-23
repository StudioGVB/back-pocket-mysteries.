import React from 'react'

export default function PricingComparison() {
  const plans = [
    { id: 'basic', name: 'Easy' },
    { id: 'premium', name: 'Standard' },
    { id: 'grand', name: 'Epic' },
    { id: 'subscribe', name: 'Unlimited' },
  ]

  const features = [
    {
      category: 'Core Experience',
      items: [
        { name: 'Difficulty / Length', basic: 'Easy (1-2 Hours)', premium: 'Standard (2-3 Hours)', grand: 'Epic (3-4 Hours)', subscribe: 'All Levels' },
        { name: 'Included Players', basic: 'Up to 6', premium: 'Up to 8', grand: 'Up to 10', subscribe: 'Up to 16' },
        { name: 'Extra Player Fee', basic: '+$3 / player', premium: '+$4 / player', grand: '+$5 / player', subscribe: 'Included' },
        { name: 'Logic Cap (Max Players)', basic: '10', premium: '12', grand: '16', subscribe: '16' },
        { name: 'Clues / Photos', basic: '~15', premium: '~22', grand: '~30', subscribe: 'Unlimited' },
        { name: 'Mysteries Included', basic: '1', premium: '1', grand: '1', subscribe: 'Unlimited (1/day)' },
        { name: 'Host Guide & Packets', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Print or Play Digitally', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Instant Download', basic: true, premium: true, grand: true, subscribe: 'Priority Generation' },
      ]
    },
    {
      category: 'Pro Customizer (+A$15)',
      items: [
        { name: 'Visual Character Customisation', basic: 'Pro Add-on', premium: 'Pro Add-on', grand: 'Pro Add-on', subscribe: 'Included' },
        { name: 'Tailored Event Vibes', basic: 'Pro Add-on', premium: 'Pro Add-on', grand: 'Pro Add-on', subscribe: 'Included' },
        { name: 'Inside Jokes & Traits', basic: 'Pro Add-on', premium: 'Pro Add-on', grand: 'Pro Add-on', subscribe: 'Included' },
        { name: 'Bespoke AI Evidence Images', basic: 'Pro Add-on', premium: 'Pro Add-on', grand: 'Pro Add-on', subscribe: 'Included' },
      ]
    },
    {
      category: 'Licensing',
      items: [
        { name: 'Personal Use', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Commercial Event Use', basic: false, premium: false, grand: false, subscribe: true },
      ]
    }
  ]

  const renderValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-brand-pink font-black text-lg">✓</span>
      ) : (
        <span className="text-gray-300 font-black text-lg">✗</span>
      )
    }
    
    if (value === 'Pro Add-on') {
      return <span className="font-black text-[10px] tracking-widest text-brand-pink uppercase px-3 py-1 bg-brand-pink/10 rounded-full">{value}</span>
    }
    
    if (value === 'Included') {
      return <span className="font-black text-[10px] tracking-widest text-brand-dark uppercase px-3 py-1 bg-brand-dark/10 rounded-full">{value}</span>
    }
    
    return <span className="font-bold text-gray-600">{value}</span>
  }

  return (
    <div className="mt-48 max-w-[80rem] mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
          Compare <span className="text-brand-pink italic">Features</span>
        </h2>
        <p className="text-gray-400 font-bold text-lg">Everything you need to know, side by side.</p>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border-2 border-gray-100 shadow-xl">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-brand-dark text-white">
              <th className="py-6 px-8 text-left font-black uppercase tracking-widest text-[10px] w-1/3">Feature</th>
              {plans.map(plan => (
                <th key={plan.id} className="py-6 px-4 text-center font-black uppercase tracking-widest text-[10px]">
                  <div className={plan.id === 'subscribe' ? 'text-white' : plan.id === 'premium' ? 'text-brand-pink' : 'text-gray-300'}>
                    {plan.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {/* Category Header */}
                <tr className="bg-brand-gray/50 border-y border-gray-100">
                  <td colSpan={5} className="py-4 px-8 font-black uppercase tracking-[0.15em] text-[10px] text-gray-500">
                    {section.category}
                  </td>
                </tr>
                {/* Items */}
                {section.items.map((item, iIdx) => (
                  <tr key={iIdx} className={`border-b border-gray-50 hover:bg-brand-pink/5 transition-colors ${iIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-5 px-8 font-bold text-gray-700 border-r border-gray-50">{item.name}</td>
                    <td className="py-5 px-4 text-center border-r border-gray-50">{renderValue(item.basic)}</td>
                    <td className="py-5 px-4 text-center border-r border-gray-50 bg-brand-pink/5">{renderValue(item.premium)}</td>
                    <td className="py-5 px-4 text-center border-r border-gray-50">{renderValue(item.grand)}</td>
                    <td className="py-5 px-4 text-center bg-brand-dark/5">{renderValue(item.subscribe)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
