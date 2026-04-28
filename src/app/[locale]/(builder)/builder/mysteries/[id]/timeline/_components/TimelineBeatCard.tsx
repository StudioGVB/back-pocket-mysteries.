'use client';

import React, { useState } from 'react';
import { Database } from '@/types/database';
import { updateBeatAction, removeBeatAction } from '../actions';

type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface TimelineBeatCardProps {
  beat: Beat;
  mysteryId: string;
  allCharacters: Character[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TimelineBeatCard({ beat, mysteryId, allCharacters, onMoveUp, onMoveDown, isFirst, isLast }: TimelineBeatCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(beat.description || '');

  const getRoleColor = (role: string | null) => {
    switch (role?.toLowerCase()) {
      case 'victim': return '#ef4444'; // Red
      case 'killer': return '#000000'; // Black
      case 'investigator': return '#3b82f6'; // Blue
      case 'assistant': return '#8b5cf6'; // Purple
      default: return '#64748b'; // Slate
    }
  };

  const renderHighlightedNarrative = (text: string) => {
    if (!text) return <span className="text-slate-300 italic">Click to add plot line...</span>;
    
    const characterNames = allCharacters.map(c => c.name);
    if (characterNames.length === 0) return <p className="whitespace-pre-wrap">{text}</p>;
    
    const regex = new RegExp(`\\b(${characterNames.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    
    return (
      <p className="whitespace-pre-wrap font-mono text-slate-700 leading-relaxed text-sm">
        {parts.map((part, i) => {
          const matchedChar = allCharacters.find(c => c.name.toLowerCase() === part.toLowerCase());
          if (matchedChar) {
            return (
              <span 
                key={i} 
                className="font-black px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${getRoleColor(matchedChar.role)}15`,
                  color: getRoleColor(matchedChar.role)
                }}
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex gap-4">
      {/* Up/Down Controls */}
      <div className="flex flex-col gap-1 items-center justify-center border-r border-slate-100 pr-4 opacity-50 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button 
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <div className="flex-grow space-y-3">
        <div className="flex justify-between items-start gap-4">
          <input 
            defaultValue={beat.event_title}
            onBlur={async (e) => {
              if (e.target.value !== beat.event_title) {
                await updateBeatAction(mysteryId, beat.id, { event_title: e.target.value });
              }
            }}
            placeholder="Beat Name..."
            className="text-lg font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-slate-200"
          />
          <button 
            onClick={async () => {
              if (confirm('Delete this plot beat?')) {
                setIsDeleting(true);
                await removeBeatAction(mysteryId, beat.id);
              }
            }}
            disabled={isDeleting}
            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 shrink-0 opacity-0 group-hover:opacity-100"
            title="Delete Beat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative min-h-[60px]">
          {isEditing ? (
            <textarea 
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={async () => {
                setIsEditing(false);
                if (description !== beat.description) {
                  await updateBeatAction(mysteryId, beat.id, { description });
                }
              }}
              placeholder="Write the plot line here..."
              className="w-full text-slate-600 font-mono text-sm bg-slate-50 border border-brand-red/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-red resize-none min-h-[80px]"
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="w-full cursor-text hover:bg-slate-50/50 p-2 -ml-2 rounded-xl border border-transparent hover:border-slate-100 transition-colors"
            >
              {renderHighlightedNarrative(description)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
