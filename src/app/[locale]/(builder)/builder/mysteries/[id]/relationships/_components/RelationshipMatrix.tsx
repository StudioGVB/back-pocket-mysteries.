// @ts-nocheck
'use client';

import React, { useState, useMemo } from 'react';
import { upsertRelationshipAction } from '../actions';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  getCharacterRoleTitle,
  getCharacterPrefix,
  hydrateTextWithCharacters,
  tokenizeTextWithCharacterRoles,
} from '@/utils/hydration';

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
              const roleA = getCharacterRoleTitle(charA);
              const prefixA = getCharacterPrefix(charA);
              const initA = roleA.replace(/^The\s+/i, '').trim()[0]?.toUpperCase() || roleA[0];
              const roleB = getCharacterRoleTitle(charB);
              const prefixB = getCharacterPrefix(charB);
              const initB = roleB.replace(/^The\s+/i, '').trim()[0]?.toUpperCase() || roleB[0];
              const hydratedNotes = hydrateTextWithCharacters(rel?.notes || '', characters, 'role');

              return (
                <tr key={pairKey} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {initA}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">
                          {prefixA && <span className="text-slate-400 mr-1">{prefixA}</span>}
                          {roleA}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {initB}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">
                          {prefixB && <span className="text-slate-400 mr-1">{prefixB}</span>}
                          {roleB}
                        </span>
                      </div>
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
                    <div className="flex flex-wrap gap-2 group/select relative">
                       <CustomSelect 
                         className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 outline-none hover:border-brand-pink transition-all"
                         value=""
                         onChange={(e) => {
                           const val = e.target.value;
                           if (!val) return;
                           const current = rel?.dynamics || [];
                           if (!current.includes(val)) {
                             handleUpdate(charA.id, charB.id, { dynamics: [...current, val] });
                           }
                         }}
                       >
                         <option value="">+ Add Dynamic...</option>
                         <optgroup label="Romantic">
                           <option value="dating">Dating</option>
                           <option value="married">Married</option>
                           <option value="affair">Affair</option>
                         </optgroup>
                         <optgroup label="Family">
                           <option value="siblings">Siblings</option>
                           <option value="parents">Parents</option>
                           <option value="cousins">Cousins</option>
                         </optgroup>
                         <optgroup label="Social">
                           <option value="besties">Besties</option>
                           <option value="rivals">Rivals</option>
                           <option value="ex-partners">Ex-Partners</option>
                         </optgroup>
                         <optgroup label="Professional">
                           <option value="co-workers">Co-workers</option>
                           <option value="boss">Boss / Subordinate</option>
                           <option value="competitors">Competitors</option>
                         </optgroup>
                       </CustomSelect>

                       <div className="flex flex-wrap gap-1 mt-1">
                         {rel?.dynamics?.map(d => (
                           <span key={d} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold group-hover:bg-slate-200 transition-colors">
                             {d}
                             <button 
                               onClick={() => {
                                 handleUpdate(charA.id, charB.id, { dynamics: rel.dynamics.filter((x: string) => x !== d) });
                               }}
                               className="hover:text-red-500"
                             >
                               ×
                             </button>
                           </span>
                         ))}
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <input 
                      key={`${pairKey}-${hydratedNotes}`}
                      placeholder="Add notes..."
                      defaultValue={hydratedNotes}
                      onBlur={(e) => handleUpdate(charA.id, charB.id, { notes: tokenizeTextWithCharacterRoles(e.target.value, characters) })}
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
