'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { Database } from '@/types/database';
import { getCharacterColor } from '@/utils/colors';

type Character = Database['public']['Tables']['characters']['Row'];
type Relationship = Database['public']['Tables']['relationships']['Row'];

interface RelationshipGraphProps {
  characters: any[];
  relationships: any[];
}

export function RelationshipGraph({ characters, relationships }: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Tighten up the graph physics so nodes are closer together
  const handleEngineStop = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 100); // 100 padding
    }
  }, []);

  const graphData = useMemo(() => {
    const nodes = characters.map((char, index) => {
      // Pre-spread nodes in a wide circle to prevent initial (0,0) clumping singularity
      const angle = (index / Math.max(characters.length, 1)) * 2 * Math.PI;
      const radius = 300; 
      
      return {
        id: char.id,
        name: char.name.split('|')[0],
        title: char.name.includes('|') ? char.name.split('|')[1] : null,
        prefix: char.name.split('|')[2] || null,
        role: char.plot_role,
        isVictim: char.is_victim,
        initials: char.name.split('|')[0].split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });

    const linksMap = new Map();
    relationships
      .filter(rel => rel.know_each_other)
      .forEach(rel => {
        // Create a directionless key to find duplicates between the same two characters
        const id1 = rel.character_a_id < rel.character_b_id ? rel.character_a_id : rel.character_b_id;
        const id2 = rel.character_a_id < rel.character_b_id ? rel.character_b_id : rel.character_a_id;
        const key = `${id1}-${id2}`;
        
        const dynamicsStr = Array.isArray(rel.dynamics) ? rel.dynamics.join(', ') : (rel.dynamics || '');

        if (!linksMap.has(key)) {
          linksMap.set(key, {
            source: rel.character_a_id,
            target: rel.character_b_id,
            dynamics: dynamicsStr
          });
        } else {
          // Append unique dynamics to the existing link
          const existing = linksMap.get(key);
          if (dynamicsStr && !existing.dynamics.includes(dynamicsStr)) {
            existing.dynamics = existing.dynamics ? `${existing.dynamics}, ${dynamicsStr}` : dynamicsStr;
          }
        }
      });

    const links = Array.from(linksMap.values());

    return { nodes, links };
  }, [characters, relationships]);

  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion, but not so high it causes NaN velocity crashes
      const chargeForce = fgRef.current.d3Force('charge');
      if (chargeForce) {
        chargeForce.strength(-800);
      }

      // Lengthen links so the nodes have more room to breathe
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        linkForce.distance(250); 
      }

      // Re-warm the simulation so forces take effect
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);

  // Color mapping based on role
  const getColor = (node: any) => {
    return getCharacterColor({
      id: node.id,
      is_victim: node.isVictim,
      plot_role: node.role
    }, characters);
  };

  // Color mapping for relationships based on dynamics
  const getLinkColor = (link: any) => {
    const dynamics = link.dynamics?.split(', ') || [];
    if (dynamics.some((d: string) => ['dating', 'married', 'affair'].includes(d))) return '#FF3366'; // Romantic
    if (dynamics.some((d: string) => ['siblings', 'parents', 'cousins'].includes(d))) return '#3B82F6'; // Family
    if (dynamics.some((d: string) => ['besties', 'rivals'].includes(d))) return '#F59E0B'; // Social
    if (dynamics.some((d: string) => ['co-workers', 'boss', 'competitors'].includes(d))) return '#94A3B8'; // Professional
    return '#CBD5E1'; // Default (slate-300)
  };

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-slate-50/30 rounded-[3rem] border border-slate-100 overflow-hidden relative shadow-inner">
      <div className="absolute top-8 left-8 z-10 space-y-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff00cf]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Victim</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff4545]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Killer</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-[#ffb92c]" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accomplice</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#48c3ff] to-[#da60ff]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Other Roles</span>
          </div>
        </div>

        <div className="flex gap-4 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="w-4 h-[1px] bg-[#FF3366]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Romantic</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-4 h-[1px] bg-[#3B82F6]" />
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Family</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-4 h-[1px] bg-[#F59E0B]" />
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Social</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-4 h-[1px] bg-[#94A3B8]" />
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Work</span>
          </div>
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeColor={getColor}
        nodeLabel="" // Disable default hover label since we permanently render it
        warmupTicks={50}
        cooldownTicks={200}
        onEngineStop={handleEngineStop}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.initials;
          const bgRadius = 14; // Larger circle

          // Circle background
          ctx.fillStyle = getColor(node);
          ctx.beginPath();
          ctx.arc(node.x, node.y, bgRadius, 0, 2 * Math.PI, false);
          ctx.fill();

          // Initials (Static size relative to graph)
          ctx.font = `bold 12px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, node.x, node.y);

          // Full Name always visible below
          const nameY = node.y + bgRadius + 12;
          ctx.font = `bold 12px "Outfit", sans-serif`;
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          const displayName = node.prefix ? `${node.prefix} ${node.name}` : node.name;
          ctx.strokeText(displayName, node.x, nameY);
          ctx.fillStyle = '#1e293b'; // slate-800
          ctx.fillText(displayName, node.x, nameY);
          
          // Role Subtitle
          const roleY = node.y + bgRadius + 24;
          const displaySubtitle = node.title ? node.title.toUpperCase() : (node.role || 'Innocent').toUpperCase();
          ctx.font = `600 8px "Outfit", sans-serif`;
          ctx.strokeText(displaySubtitle, node.x, roleY);
          ctx.fillStyle = '#94a3b8'; // slate-400
          ctx.fillText(displaySubtitle, node.x, roleY);
        }}
        linkColor={getLinkColor}
        linkWidth={link => {
          const dynamics = (link as any).dynamics?.split(', ') || [];
          if (dynamics.includes('married') || dynamics.includes('siblings')) return 2;
          return 1;
        }}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.01}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link: any, ctx, globalScale) => {
          if (globalScale < 0.3) return; // Hide text when zoomed out too far

          const start = link.source;
          const end = link.target;

          if (typeof start !== 'object' || typeof end !== 'object') return;

          // text pos
          const textPos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2
          };

          const relLink = link as any;
          const label = relLink.dynamics || '';

          const fontSize = 8; // Larger text for link dynamics
          ctx.font = `${fontSize}px "Outfit", sans-serif`;

          // Draw text background
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // More opaque background
          ctx.fillRect(textPos.x - textWidth / 2 - 4, textPos.y - fontSize / 2 - 4, textWidth + 8, fontSize + 8);

          // Draw text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#94a3b8'; // slate-400
          ctx.fillText(label, textPos.x, textPos.y);
        }}
      />
    </div>
  );
}
