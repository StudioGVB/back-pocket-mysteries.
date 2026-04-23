'use client';

import React, { useState, useRef, useEffect } from 'react';
import { generateRoleSuggestionsAction } from '../actions';

interface RoleTitleInputProps {
  mysteryId: string;
  defaultValue?: string;
  inputClassName?: string;
}

export function RoleTitleInput({ mysteryId, defaultValue = '', inputClassName = '' }: RoleTitleInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = async () => {
    // If we already have suggestions, just open the dropdown
    if (suggestions.length > 0 && !isGenerating) {
      setIsOpen(true);
      return;
    }

    setIsGenerating(true);
    setIsOpen(true);
    try {
      const results = await generateRoleSuggestionsAction(mysteryId);
      setSuggestions(results);
    } catch (e) {
      console.error(e);
      setIsOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input 
          name="title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder="e.g. Chief Stew"
          className={`${inputClassName} pr-12`}
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="absolute right-3 w-8 h-8 rounded-xl bg-brand-pink/10 text-brand-pink hover:bg-brand-pink hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
          title="AI Suggest Roles"
        >
          {isGenerating ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : '✨'}
        </button>
      </div>

      {isOpen && (isGenerating || suggestions.length > 0) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {isGenerating ? (
            <div className="p-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Brainstorming...
            </div>
          ) : (
            <div className="py-2">
              <div className="px-5 py-2 flex items-center justify-between border-b border-slate-50 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink">AI Suggestions</span>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setSuggestions([]); handleGenerate(); }}
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-900 uppercase"
                >
                  Regenerate
                </button>
              </div>
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setValue(suggestion);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors flex items-center gap-3 group"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs group-hover:bg-brand-pink/10 group-hover:text-brand-pink transition-colors">🎭</span>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
