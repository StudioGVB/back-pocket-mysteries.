import React from 'react'

export default function PricingComparison() {
  const plans = [
    { id: 'basic', name: 'Basic (4–6)' },
    { id: 'premium', name: 'Premium (4–10)' },
    { id: 'grand', name: 'Grand (4–16)' },
    { id: 'subscribe', name: 'Unlimited' },
  ]

  const features = [
    {
      category: 'Party Scale & Story Web',
      items: [
        { name: 'Players Included', basic: '4–6 Players', premium: '4–10 Players', grand: '4–16 Players', subscribe: '4–16 Players' },
        { name: 'Custom Character Booklets Generated', basic: 'Up to 6 Roles', premium: 'Up to 10 Roles', grand: 'Up to 16 Roles', subscribe: 'Up to 16 Roles' },
        { name: 'Relationship Web & Subplots', basic: 'Core Suspect Web', premium: 'Expanded Alliances & Subplots', grand: 'Full-House Multi-Faction Web', subscribe: 'All Group Sizes' },
        { name: 'Mysteries Included', basic: '1 Mystery Pack', premium: '1 Mystery Pack', grand: '1 Mystery Pack', subscribe: 'Unlimited / Mo' },
        { name: 'Monthly Gift Pass (Gift a Mystery to a Friend)', basic: false, premium: false, grand: false, subscribe: '1 Free Gift / Mo' },
      ]
    },
    {
      category: 'Core Experience (Included on Every Tier)',
      items: [
        { name: 'Complexity Levels (Easy, Medium, Hard)', basic: 'Included', premium: 'Included', grand: 'Included', subscribe: 'Included' },
        { name: 'Spice Levels (Clean, Mild, Spicy, Filthy)', basic: 'Included', premium: 'Included', grand: 'Included', subscribe: 'Included' },
        { name: 'Guest Names, Avatars & Quirks Woven In', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Interactive Chat, Receipt & Audio Clues', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Kahoot-Style Live Lobby & 6-Digit PIN', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Spoiler-Free Host Mode', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Print Booklets or Play 100% Digitally', basic: true, premium: true, grand: true, subscribe: true },
      ]
    },
    {
      category: 'Licensing',
      items: [
        { name: 'Personal Party Use', basic: true, premium: true, grand: true, subscribe: true },
        { name: 'Commercial Event & Venue Use', basic: false, premium: false, grand: false, subscribe: true },
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
    
    if (value === 'Included') {
      return <span className="font-black text-[10px] tracking-widest text-emerald-600 uppercase px-3 py-1 bg-emerald-50 rounded-full">{value}</span>
    }
    
    return <span className="font-bold text-gray-600">{value}</span>
  }

  return (
    <div className="mt-48 max-w-[80rem] mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
          Compare <span className="text-brand-pink italic">Packages</span>
        </h2>
        <p className="text-gray-400 font-bold text-lg">Same full-featured experience on every tier, only your group size changes the price.</p>
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
