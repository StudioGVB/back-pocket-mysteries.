'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { Database } from '@/types/database';

type Character = Database['public']['Tables']['characters']['Row'];
type Relationship = Database['public']['Tables']['relationships']['Row'];

interface RelationshipGraphProps {
  characters: any[];
  relationships: any[];
}

export function RelationshipGraph({ characters, relationships }: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>();
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
    const nodes = characters.map(char => ({
      id: char.id,
      name: char.name,
      role: char.plot_role,
      isVictim: char.is_victim,
      initials: char.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }));

    const links = relationships
      .filter(rel => rel.know_each_other)
      .map(rel => ({
        source: rel.character_a_id,
        target: rel.character_b_id,
        dynamics: Array.isArray(rel.dynamics) ? rel.dynamics.join(', ') : ''
      }));

    return { nodes, links };
  }, [characters, relationships]);

  useEffect(() => {
    if (fgRef.current) {
      // Significantly increase repulsion to prevent overlapping text and nodes
      fgRef.current.d3Force('charge')?.strength(-800); 
      // Lengthen links so the dense AI connections have room to breathe
      fgRef.current.d3Force('link')?.distance(160); 
    }
  }, [graphData]);

  // Color mapping based on role
  const getColor = (node: any) => {
    if (node.isVictim) return '#FF3366'; // Brand Pink / Blood Red
    if (node.role === 'killer') return '#EF4444'; // Red-500
    if (node.role === 'assistant') return '#F59E0B'; // Amber-500
    return '#10B981'; // Green-500 (Innocent)
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
            <span className="w-2 h-2 rounded-full bg-[#FF3366]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Victim</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Killer</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accomplice</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Innocent</span>
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
        onEngineStop={handleEngineStop}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.initials;
          const bgRadius = 14; // Larger circle

          // Circle background
          ctx.fillStyle = getColor(node);
          ctx.beginPath();
          ctx.arc(node.x, node.y, bgRadius, 0, 2 * Math.PI, false);
          ctx.fill();

          // Initials
          const fontSize = Math.max(10 / globalScale, 10); // Don't let it get too small relative to circle
          ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, node.x, node.y);

          // Full Name always visible below
          const nameFontSize = Math.max(12 / globalScale, 10);
          ctx.fillStyle = '#1e293b'; // slate-800
          ctx.font = `bold ${nameFontSize}px "Outfit", sans-serif`;
          ctx.fillText(node.name, node.x, node.y + bgRadius + 8);
          
          // Role Subtitle
          const roleFontSize = Math.max(8 / globalScale, 6);
          ctx.fillStyle = '#94a3b8'; // slate-400
          ctx.font = `600 ${roleFontSize}px "Outfit", sans-serif`;
          ctx.fillText((node.role || 'Innocent').toUpperCase(), node.x, node.y + bgRadius + 8 + nameFontSize);
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
          if (globalScale < 1.5) return;
          const MAX_FONT_SIZE = 4;
          const LABEL_NODE_MARGIN = 4;

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

          const fontSize = Math.min(MAX_FONT_SIZE, 12 / globalScale);
          ctx.font = `${fontSize}px "Outfit", sans-serif`;

          // Draw text background
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(textPos.x - textWidth / 2 - 2, textPos.y - fontSize / 2 - 2, textWidth + 4, fontSize + 4);

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
