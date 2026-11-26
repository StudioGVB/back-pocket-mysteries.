'use client';

import React from 'react';
import { getBaseCharacterRoleTitle, tokenizeTextWithCharacterRoles } from '@/utils/hydration';

export const CHARACTER_PILL_STYLES: {
  bg: string;
  text: string;
  border: string;
  dot: string;
  hex: string;
}[] = [
  {
    bg: 'bg-pink-100',
    text: 'text-pink-900',
    border: 'border-pink-300',
    dot: 'bg-pink-500',
    hex: '#ec4899',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    hex: '#e11d48',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  {
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
    dot: 'bg-blue-600',
    hex: '#2563eb',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
    dot: 'bg-purple-600',
    hex: '#9333ea',
  },
  {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
    hex: '#059669',
  },
  {
    bg: 'bg-cyan-100',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
    dot: 'bg-cyan-600',
    hex: '#0891b2',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
    dot: 'bg-indigo-600',
    hex: '#4f46e5',
  },
];

export function getCharacterPillStyle(characters: any[], characterOrRole: any): (typeof CHARACTER_PILL_STYLES)[number] {
  const targetRole =
    typeof characterOrRole === 'string'
      ? characterOrRole.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase()
      : getBaseCharacterRoleTitle(characterOrRole).replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();

  const idx = characters.findIndex((c) => {
    const clean = getBaseCharacterRoleTitle(c).replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
    return clean === targetRole || c.id === characterOrRole?.id;
  });

  if (idx >= 0) {
    return CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length];
  }
  return CHARACTER_PILL_STYLES[0];
}

/**
 * Renders any text containing {{The Role}} or {{The Role_his}} / {{The Role_sibling}} tokens
 * (or auto-tokenizes character role names) with bold, color-coded character pills!
 */
export function HighlightedMysteryText({
  text,
  characters,
  className = '',
}: {
  text?: string | null;
  characters: any[];
  className?: string;
}) {
  if (!text) return null;

  const tokenized = tokenizeTextWithCharacterRoles(text, characters);

  const roleMap = new Map<
    string,
    { char: any; idx: number; style: (typeof CHARACTER_PILL_STYLES)[number] }
  >();
  characters.forEach((c, idx) => {
    const clean = getBaseCharacterRoleTitle(c).replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
    roleMap.set(clean, {
      char: c,
      idx,
      style: CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length],
    });
  });

  const parts = tokenized.split(/(\{\{[^}]+\}\})/g);

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        if (!part.startsWith('{{') || !part.endsWith('}}')) {
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }

        const inner = part.slice(2, -2).trim();
        const suffixMatch = inner.match(
          /^(.+?)_(he|him|his|himself|sibling|spouse|inlaw)$/i
        );

        if (suffixMatch) {
          const baseRole = suffixMatch[1].trim();
          const suffix = suffixMatch[2].toLowerCase();
          const entry = roleMap.get(baseRole.toLowerCase());
          const isFemale = entry?.char?.gender === 'female';

          let resolvedWord = inner;
          if (suffix === 'he') resolvedWord = isFemale ? 'she' : 'he';
          else if (suffix === 'him') resolvedWord = isFemale ? 'her' : 'him';
          else if (suffix === 'his') resolvedWord = isFemale ? 'her' : 'his';
          else if (suffix === 'himself') resolvedWord = isFemale ? 'herself' : 'himself';
          else if (suffix === 'sibling') resolvedWord = isFemale ? 'sister' : 'brother';
          else if (suffix === 'spouse') resolvedWord = isFemale ? 'wife' : 'husband';
          else if (suffix === 'inlaw')
            resolvedWord = isFemale ? 'sister-in-law' : 'brother-in-law';

          const style = entry?.style || CHARACTER_PILL_STYLES[0];
          return (
            <span
              key={i}
              title={`Gender-flex token: ${part} (${baseRole})`}
              className={`font-bold underline decoration-dotted underline-offset-2 ${style.text}`}
            >
              {resolvedWord}
            </span>
          );
        }

        const entry = roleMap.get(inner.toLowerCase());
        const style = entry?.style || {
          bg: 'bg-slate-200',
          text: 'text-slate-900',
          border: 'border-slate-300',
          dot: 'bg-slate-600',
          hex: '#475569',
        };

        const roleBadge = entry?.char?.is_victim
          ? '💀'
          : entry?.char?.plot_role === 'killer'
            ? '🔪'
            : entry?.char?.plot_role === 'assistant'
              ? '🤝'
              : '';

        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md text-xs font-black border ${style.bg} ${style.text} ${style.border} shadow-2xs align-baseline`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            <span>{inner}</span>
            {roleBadge && <span className="text-[10px]">{roleBadge}</span>}
          </span>
        );
      })}
    </span>
  );
}
