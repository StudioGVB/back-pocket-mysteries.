'use client';

import React, { useState } from 'react';
import { upsertRelationshipAction } from '../actions';

interface RelationshipMatrixProps {
  mysteryId: string;
  characters: any[];
  relationships: any[];
}

export function RelationshipMatrix({ mysteryId, characters, relationships }: RelationshipMatrixProps) {
  const [isPending, setIsPending] = useState<string | null>(null);

  // Generate all unique character pairs (Order doesn't matter, A < B)
  const pairs = useMemo(() => {
    const p: [any, any][] = [];
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        p.push([characters[i], characters[j]]);
      }
    }
    return p;
  }, [characters]);

  const findRelationship = (idA: string, idB: string) => {
    const [a, b] = [idA, idB].sort();
    return relationships.find(r => r.character_a_id === a && r.character_b_id === b);
  };

  const handleUpdate = async (idA: string, idB: string, updates: any) => {
    const pairKey = `${idA}-${idB}`;
    setIsPending(pairKey);
    try {
      const existing = findRelationship(idA, idB);
      await upsertRelationshipAction(mysteryId, {
        ...(existing || {}),
        character_a_id: idA,
        character_b_id: idB,
        ...updates
      });
    } finally {
      setIsPending(null);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Character A</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Character B</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Know Each Other</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Dynamics</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pairs.map(([charA, charB]) => {
              const rel = findRelationship(charA.id, charB.id);
              const pairKey = `${charA.id}-${charB.id}`;
              const isUpdating = isPending === pairKey;

              return (
                <tr key={pairKey} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {charA.name[0]}
                      </div>
                      <span className="text-xs font-black text-slate-900">{charA.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {charB.name[0]}
                      </div>
                      <span className="text-xs font-black text-slate-900">{charB.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button
                      onClick={() => handleUpdate(charA.id, charB.id, { know_each_other: !rel?.know_each_other })}
                      className={`w-10 h-6 rounded-full transition-all relative ${rel?.know_each_other ? 'bg-brand-pink' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${rel?.know_each_other ? 'left-5' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-wrap gap-2">
                       {/* Simplified multi-select/tag entry for now */}
                       <input 
                         placeholder="e.g. Family, Rivals"
                         value={rel?.dynamics?.join(', ') || ''}
                         onChange={(e) => {
                           // This would need a debounce or a "save" button to be performant
                         }}
                         onBlur={(e) => {
                           const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                           handleUpdate(charA.id, charB.id, { dynamics: val });
                         }}
                         className="bg-transparent border-b border-dashed border-slate-200 text-xs font-bold text-slate-600 outline-none focus:border-brand-pink min-w-[120px]"
                       />
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <input 
                      placeholder="Add notes..."
                      defaultValue={rel?.notes || ''}
                      onBlur={(e) => handleUpdate(charA.id, charB.id, { notes: e.target.value })}
                      className="w-full bg-transparent border-none text-xs text-slate-400 font-medium outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper needed for useMemo
function useMemo(factory: () => any, deps: any[]) {
  return React.useMemo(factory, deps);
}
