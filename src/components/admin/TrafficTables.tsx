import React from 'react';

export function TrafficTables({ topPaths, topCountries }: { topPaths: any[], topCountries: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      {/* Top Paths */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-6">Top Pages</h3>
        <div className="space-y-4">
          {topPaths.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm font-bold text-gray-700 truncate max-w-[70%]">{item.key || '/'}</span>
              <span className="text-sm font-black text-brand-dark">{item.visitors.toLocaleString()}</span>
            </div>
          ))}
          {topPaths.length === 0 && <p className="text-sm text-gray-400">No data available.</p>}
        </div>
      </div>

      {/* Top Countries */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-6">Top Countries</h3>
        <div className="space-y-4">
          {topCountries.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFlagEmoji(item.key)}</span>
                <span className="text-sm font-bold text-gray-700">{item.key || 'Unknown'}</span>
              </div>
              <span className="text-sm font-black text-brand-dark">{item.visitors.toLocaleString()}</span>
            </div>
          ))}
          {topCountries.length === 0 && <p className="text-sm text-gray-400">No data available.</p>}
        </div>
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
