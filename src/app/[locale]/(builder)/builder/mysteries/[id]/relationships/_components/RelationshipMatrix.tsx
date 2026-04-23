// @ts-nocheck
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
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">
                          {charA.name.split('|')[2] && <span className="text-slate-400 mr-1">{charA.name.split('|')[2]}</span>}
                          {charA.name.split('|')[0]}
                        </span>
                        {charA.name.includes('|') && charA.name.split('|')[1] && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{charA.name.split('|')[1]}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {charB.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">
                          {charB.name.split('|')[2] && <span className="text-slate-400 mr-1">{charB.name.split('|')[2]}</span>}
                          {charB.name.split('|')[0]}
                        </span>
                        {charB.name.includes('|') && charB.name.split('|')[1] && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{charB.name.split('|')[1]}</span>
                        )}
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
                       <select 
                         className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 outline-none hover:border-brand-pink transition-all appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
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
                       </select>

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
