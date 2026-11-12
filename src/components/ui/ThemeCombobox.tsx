'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export const PRESET_MYSTERY_THEMES: string[] = [
  'Reality TV Reunion',
  'Retro Circus Noir',
  '1920s Speakeasy / Great Gatsby',
  'Yacht / Luxury Cruise',
  'Corporate Retreat',
  'Haunted Mansion',
  'Masquerade Ball',
  'Wild West Saloon',
  'Hollywood Premiere',
  '80s Prom',
  '90s / Y2K Pop Afterparty',
  'Casino Royale',
  'Winter Chalet / Apres-Ski',
  'Tropical Island Resort',
  'Pirate Ship',
  'High School Reunion',
  'Space Station',
  'Art Gallery Opening',
  'Fashion Week / Met Gala',
  'Regency Ball (Bridgerton Vibe)',
  'Bachelorette / Villa Getaway',
  'Country Music / Nashville Honky-Tonk',
  'Fantasy Kingdom',
  'Cyberpunk City',
  'Vintage Circus',
  'Wedding Reception',
  'Vineyard / Wine Tasting',
  'Country Club Golf Tournament',
  'Gothic Castle',
  'Mafia / Mobster',
  'Roaring 20s Jazz Club',
  'Victorian London / Sherlock',
  'Medieval Banquet',
  'Summer Camp',
  "Billionaire's Private Island",
  'Train Journey (Orient Express)',
  'Halloween Party',
  'Christmas / Holiday Party',
  'New Year’s Eve Gala',
];

interface ThemeComboboxProps {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  variant?: 'underline' | 'boxed';
}

export function ThemeCombobox({
  name = 'theme',
  defaultValue = '',
  value: controlledValue,
  onChange,
  required = true,
  placeholder = 'Select a theme or type your own...',
  variant = 'underline',
}: ThemeComboboxProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(defaultValue || '');
    }
  }, [defaultValue, isControlled]);

  const currentValue = isControlled ? controlledValue! : internalValue;

  const updateValue = (nextVal: string) => {
    if (!isControlled) {
      setInternalValue(nextVal);
    }
    onChange?.(nextVal);
  };

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, 240);
    const left = Math.min(rect.left, Math.max(8, viewportWidth - minWidth - 8));

    if (openUpward) {
      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        width: `${minWidth}px`,
        bottom: `${viewportHeight - rect.top + 6}px`,
        maxHeight: `${Math.min(300, spaceAbove - 16)}px`,
        zIndex: 9999,
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        width: `${minWidth}px`,
        top: `${rect.bottom + 6}px`,
        maxHeight: `${Math.min(300, Math.max(180, spaceBelow - 16))}px`,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleScrollOrResize = () => updateMenuPosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsFiltering(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFiltering(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  const trimmedQuery = currentValue.trim();
  const hasExactPresetMatch = PRESET_MYSTERY_THEMES.some(
    (t) => t.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const visiblePresets =
    isFiltering && trimmedQuery.length > 0
      ? PRESET_MYSTERY_THEMES.filter((t) =>
          t.toLowerCase().includes(trimmedQuery.toLowerCase())
        )
      : PRESET_MYSTERY_THEMES;

  const handleSelectOption = (themeValue: string) => {
    updateValue(themeValue);
    setIsOpen(false);
    setIsFiltering(false);
  };

  const handleStartCustom = () => {
    updateValue('');
    setIsFiltering(true);
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={currentValue}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setIsOpen(true);
            setIsFiltering(false);
          }}
          onChange={(e) => {
            updateValue(e.target.value);
            setIsFiltering(true);
            if (!isOpen) setIsOpen(true);
          }}
          className={
            variant === 'underline'
              ? 'w-full pl-0 pr-9 py-2 bg-transparent border-b-2 border-slate-200 focus:border-brand-pink outline-none font-black text-2xl transition-all text-slate-900 placeholder:text-slate-300'
              : 'w-full pl-6 pr-11 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all font-bold text-slate-900 placeholder:text-slate-300'
          }
        />

        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle preset themes list"
          onClick={() => {
            setIsFiltering(false);
            setIsOpen((prev) => !prev);
          }}
          className={`absolute ${
            variant === 'underline' ? 'right-0' : 'right-3.5'
          } p-1.5 rounded-lg text-slate-400 hover:text-brand-pink transition-colors cursor-pointer`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-pink' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.25"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={menuStyle}
            className="overflow-y-auto rounded-2xl p-1.5 border bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] transition-all animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Custom theme indicator if the user typed something not in the preset list */}
            {trimmedQuery.length > 0 && !hasExactPresetMatch && (
              <button
                type="button"
                onClick={() => handleSelectOption(trimmedQuery)}
                className="w-full px-3.5 py-2.5 mb-1 rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-3 bg-brand-pink/10 text-brand-pink font-bold border border-brand-pink/20 cursor-pointer"
              >
                <span className="truncate">
                  ✨ Use Custom Theme: &ldquo;{trimmedQuery}&rdquo;
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider shrink-0">
                  Custom
                </span>
              </button>
            )}

            {/* Quick button to clear & type a custom theme */}
            <button
              type="button"
              onClick={handleStartCustom}
              className="w-full px-3.5 py-2 mb-1 rounded-xl text-xs text-left flex items-center justify-between gap-2 text-slate-500 hover:bg-slate-50 hover:text-brand-pink font-bold border-b border-slate-100 cursor-pointer"
            >
              <span>✏️ Not on the list? Type any custom theme...</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
                Type Custom
              </span>
            </button>

            <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">
              Preset Themes ({visiblePresets.length})
            </div>

            {visiblePresets.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-slate-400 font-medium">
                No preset matches &ldquo;{trimmedQuery}&rdquo;. Press Enter or click above to use your custom theme!
              </div>
            ) : (
              visiblePresets.map((preset) => {
                const isSelected = preset.toLowerCase() === trimmedQuery.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(preset)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-brand-pink/8 text-brand-pink font-bold'
                        : 'text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{preset}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 shrink-0 text-brand-pink"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
