'use client';
import React, { useState, useMemo } from 'react';
import { FAQ, FAQCategory } from '@/data/faqs';

const categories: FAQCategory[] = [
  "What We Do",
  "Pricing & Purchasing",
  "Gameplay & Hosting",
  "Customization",
  "Delivery & Setup",
  "Themes & Content"
];

export default function FAQSearch({ faqs }: { faqs: FAQ[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'All'>('All');

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = faq.q.toLowerCase().includes(searchLower) || faq.a.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, searchTerm, selectedCategory]);

  return (
    <div className="w-full">
      {/* Search and Filter Controls */}
      <div className="mb-16 bg-gray-50 p-6 lg:p-10 rounded-[2rem] border-2 border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search for answers..."
              className="w-full bg-white border-2 border-gray-200 rounded-full py-4 pl-14 pr-6 focus:outline-none focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10 transition-all text-gray-700 font-bold placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              selectedCategory === 'All'
                ? 'bg-brand-dark text-white shadow-md'
                : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-brand-pink hover:text-brand-pink'
            }`}
          >
            All Questions
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-pink text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-brand-pink hover:text-brand-pink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-gray-100 border-dashed">
          <p className="text-gray-500 font-bold text-lg">No questions found matching your search.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
            className="mt-4 text-brand-pink font-black uppercase tracking-widest text-sm hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="card-branded p-8 lg:p-10 group hover:border-brand-pink transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="font-black text-brand-dark uppercase tracking-tight text-xl lg:text-2xl group-hover:text-brand-pink transition-colors">
                  {faq.q}
                </h3>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                  {faq.category}
                </span>
              </div>
              <div className="w-12 h-1 bg-brand-pink mb-6 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-gray-600 font-medium text-lg leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
