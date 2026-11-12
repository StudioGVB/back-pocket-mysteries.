'use client';

import React, { useMemo, useState } from 'react';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { getCharacterColor } from '@/utils/colors';
import {
  getCharacterRoleTitle,
  getCharacterDisplayName,
  hydrateTextWithCharacters,
} from '@/utils/hydration';

interface RelationshipGraphProps {
  characters: any[];
  relationships: any[];
  variant?: 'light' | 'dark';
  revealPlotRoles?: boolean;
}

type BondCategory = 'all' | 'romantic' | 'family' | 'social' | 'work';

interface GraphNode {
  id: string;
  char: any;
  roleTitle: string;
  guestName: string | null;
  plotRole: string;
  isVictim: boolean;
  avatarUrl: string | null;
  initials: string;
  color: string;
  xPct: number;
  yPct: number;
  svgX: number;
  svgY: number;
  connectionCount: number;
}

interface GraphLink {
  key: string;
  sourceId: string;
  targetId: string;
  dynamicsList: string[];
  primaryDynamic: string;
  category: Exclude<BondCategory, 'all'>;
  color: string;
  notes: string[];
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 620;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;

function classifyDynamics(dynamicsList: string[]): {
  category: Exclude<BondCategory, 'all'>;
  color: string;
} {
  const lower = dynamicsList.map((d) => d.toLowerCase());
  if (
    lower.some((d) =>
      [
        'dating',
        'married',
        'affair',
        'ex',
        'exes',
        'ex-partners',
        'lovers',
        'romantic',
        'flirt',
        'engaged',
        'spouses',
      ].some((kw) => d.includes(kw))
    )
  ) {
    return { category: 'romantic', color: '#FF3366' };
  }
  if (
    lower.some((d) =>
      ['sibling', 'parent', 'cousin', 'family', 'brother', 'sister', 'in-law', 'heir'].some((kw) =>
        d.includes(kw)
      )
    )
  ) {
    return { category: 'family', color: '#3B82F6' };
  }
  if (
    lower.some((d) =>
      [
        'co-worker',
        'boss',
        'competitor',
        'business',
        'partner',
        'client',
        'colleague',
        'investor',
        'manager',
        'agent',
        'employer',
      ].some((kw) => d.includes(kw))
    )
  ) {
    return { category: 'work', color: '#6366F1' };
  }
  return { category: 'social', color: '#F59E0B' };
}

export function RelationshipGraph({
  characters,
  relationships,
  variant = 'light',
  revealPlotRoles = true,
}: RelationshipGraphProps) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [hoveredCharId, setHoveredCharId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<BondCategory>('all');
  const [showAllEdgeLabels, setShowAllEdgeLabels] = useState<boolean>(false);

  const isDark = variant === 'dark';
  const activeFocusCharId = hoveredCharId || selectedCharId;

  const { nodes, links, nodeMap } = useMemo(() => {
    const validChars = (characters || []).filter(Boolean);
    const charIds = new Set(validChars.map((c) => c.id));

    // Combine bidirectional relationship entries between the same pair of characters
    const linksMap = new Map<string, GraphLink>();
    const connectionCounts = new Map<string, number>();

    (relationships || [])
      .filter(
        (rel) =>
          rel &&
          rel.know_each_other !== false &&
          charIds.has(rel.character_a_id) &&
          charIds.has(rel.character_b_id) &&
          rel.character_a_id !== rel.character_b_id
      )
      .forEach((rel) => {
        const id1 =
          rel.character_a_id < rel.character_b_id ? rel.character_a_id : rel.character_b_id;
        const id2 =
          rel.character_a_id < rel.character_b_id ? rel.character_b_id : rel.character_a_id;
        const key = `${id1}__${id2}`;

        const rawDynamics = Array.isArray(rel.dynamics)
          ? rel.dynamics
          : typeof rel.dynamics === 'string' && rel.dynamics.trim()
          ? rel.dynamics.split(',').map((s: string) => s.trim())
          : [];

        const noteText = typeof rel.notes === 'string' && rel.notes.trim() ? rel.notes.trim() : '';

        if (!linksMap.has(key)) {
          const { category, color } = classifyDynamics(rawDynamics);
          linksMap.set(key, {
            key,
            sourceId: id1,
            targetId: id2,
            dynamicsList: [...rawDynamics],
            primaryDynamic: rawDynamics[0] || 'Connected',
            category,
            color,
            notes: noteText ? [noteText] : [],
          });
        } else {
          const existing = linksMap.get(key)!;
          rawDynamics.forEach((d: string) => {
            if (d && !existing.dynamicsList.some((ed) => ed.toLowerCase() === d.toLowerCase())) {
              existing.dynamicsList.push(d);
            }
          });
          if (existing.dynamicsList.length > 0) {
            existing.primaryDynamic = existing.dynamicsList.slice(0, 2).join(' • ');
            const classified = classifyDynamics(existing.dynamicsList);
            existing.category = classified.category;
            existing.color = classified.color;
          }
          if (noteText && !existing.notes.includes(noteText)) {
            existing.notes.push(noteText);
          }
        }
      });

    const builtLinks = Array.from(linksMap.values());
    builtLinks.forEach((l) => {
      connectionCounts.set(l.sourceId, (connectionCounts.get(l.sourceId) || 0) + 1);
      connectionCounts.set(l.targetId, (connectionCounts.get(l.targetId) || 0) + 1);
    });

    // Separate victim (center hub) from suspects (outer ring)
    const victimChar = validChars.find((c) => c.is_victim || c.plot_role === 'victim');
    const ringChars = victimChar
      ? validChars.filter((c) => c.id !== victimChar.id)
      : validChars;

    const buildNode = (char: any, xPct: number, yPct: number): GraphNode => {
      const roleTitle = getCharacterRoleTitle(char);
      const guestName =
        typeof char.guest_name === 'string' && char.guest_name.trim()
          ? char.guest_name.trim()
          : typeof char.profile_data?.guest_name === 'string' &&
            char.profile_data.guest_name.trim()
          ? char.profile_data.guest_name.trim()
          : null;

      const rawAvatar =
        char.profile_data?.character_photo_url ||
        char.profile_data?.avatar_url ||
        char.image_url ||
        null;
      const avatarUrl = rawAvatar ? resolveDisplayAvatarUrl(rawAvatar) : null;

      const initials = roleTitle
        .replace(/^The\s+/i, '')
        .split(/\s+/)
        .map((w: string) => w[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const isVictim = Boolean(char.is_victim || char.plot_role === 'victim');
      const plotRole = isVictim ? 'victim' : char.plot_role || 'suspect';

      return {
        id: char.id,
        char,
        roleTitle,
        guestName,
        plotRole,
        isVictim,
        avatarUrl,
        initials: initials || '?',
        color: getCharacterColor(
          {
            id: char.id,
            is_victim: isVictim,
            plot_role: plotRole,
          },
          validChars
        ),
        xPct,
        yPct,
        svgX: (xPct / 100) * SVG_WIDTH,
        svgY: (yPct / 100) * SVG_HEIGHT,
        connectionCount: connectionCounts.get(char.id) || 0,
      };
    };

    const builtNodes: GraphNode[] = [];
    if (victimChar) {
      builtNodes.push(buildNode(victimChar, 50, 50));
    }

    const totalRing = Math.max(ringChars.length, 1);
    // Elliptical radii in percentage points (leaves generous margin for cards around the edges)
    const rxPct = 37;
    const ryPct = 36;

    ringChars.forEach((char, idx) => {
      // Start at top (-90 deg) and distribute evenly clockwise
      const angle = -Math.PI / 2 + (idx / totalRing) * 2 * Math.PI;
      const xPct = 50 + Math.cos(angle) * rxPct;
      const yPct = 50 + Math.sin(angle) * ryPct;
      builtNodes.push(buildNode(char, xPct, yPct));
    });

    const map = new Map<string, GraphNode>();
    builtNodes.forEach((n) => map.set(n.id, n));

    return {
      nodes: builtNodes,
      links: builtLinks,
      nodeMap: map,
    };
  }, [characters, relationships]);

  // Filter links by selected category
  const categoryFilteredLinks = useMemo(() => {
    if (categoryFilter === 'all') return links;
    return links.filter((l) => l.category === categoryFilter);
  }, [links, categoryFilter]);

  // Connected node IDs when a character is focused
  const focusedConnectedIds = useMemo(() => {
    if (!activeFocusCharId) return null;
    const set = new Set<string>([activeFocusCharId]);
    categoryFilteredLinks.forEach((l) => {
      if (l.sourceId === activeFocusCharId) set.add(l.targetId);
      if (l.targetId === activeFocusCharId) set.add(l.sourceId);
    });
    return set;
  }, [activeFocusCharId, categoryFilteredLinks]);

  // Compute curved SVG path and label midpoint for each link
  const renderedPaths = useMemo(() => {
    return categoryFilteredLinks
      .map((link, idx) => {
        const source = nodeMap.get(link.sourceId);
        const target = nodeMap.get(link.targetId);
        if (!source || !target) return null;

        const x1 = source.svgX;
        const y1 = source.svgY;
        const x2 = target.svgX;
        const y2 = target.svgY;

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const chordLen = Math.max(Math.hypot(dx, dy), 1);

        // Unit normal perpendicular to the chord
        let nx = -dy / chordLen;
        let ny = dx / chordLen;

        // Make sure the normal points outward away from the center hub so outer-ring chords arch around the victim
        const toMidX = mx - CENTER_X;
        const toMidY = my - CENTER_Y;
        const distFromCenter = Math.hypot(toMidX, toMidY);

        if (toMidX * nx + toMidY * ny < 0) {
          nx = -nx;
          ny = -ny;
        }

        let curveOffset = 22;
        const involvesCenter = source.isVictim || target.isVictim;
        if (involvesCenter) {
          // Gentle curve for spokes radiating from the center victim
          curveOffset = idx % 2 === 0 ? 18 : -18;
        } else if (distFromCenter < 130) {
          // Outer-ring chord passes near the center victim: arch it cleanly around the center
          curveOffset = 155 - distFromCenter;
        } else {
          curveOffset = 26;
        }

        const qx = mx + nx * curveOffset;
        const qy = my + ny * curveOffset;

        // Point on quadratic Bezier at t = 0.5
        const labelX = 0.25 * x1 + 0.5 * qx + 0.25 * x2;
        const labelY = 0.25 * y1 + 0.5 * qy + 0.25 * y2;

        const isHighlighted =
          !activeFocusCharId ||
          link.sourceId === activeFocusCharId ||
          link.targetId === activeFocusCharId;

        const isDirectFocus =
          Boolean(activeFocusCharId) &&
          (link.sourceId === activeFocusCharId || link.targetId === activeFocusCharId);

        return {
          link,
          source,
          target,
          pathD: `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`,
          labelX,
          labelY,
          isHighlighted,
          isDirectFocus,
        };
      })
      .filter(Boolean) as {
      link: GraphLink;
      source: GraphNode;
      target: GraphNode;
      pathD: string;
      labelX: number;
      labelY: number;
      isHighlighted: boolean;
      isDirectFocus: boolean;
    }[];
  }, [categoryFilteredLinks, nodeMap, activeFocusCharId]);

  // Focused character's detailed connections for the bottom inspector panel
  const selectedNode = selectedCharId ? nodeMap.get(selectedCharId) || null : null;
  const selectedNodeConnections = useMemo(() => {
    if (!selectedCharId) return [];
    return links
      .filter((l) => l.sourceId === selectedCharId || l.targetId === selectedCharId)
      .map((l) => {
        const otherId = l.sourceId === selectedCharId ? l.targetId : l.sourceId;
        const otherNode = nodeMap.get(otherId);
        return otherNode ? { link: l, otherNode } : null;
      })
      .filter(Boolean) as { link: GraphLink; otherNode: GraphNode }[];
  }, [selectedCharId, links, nodeMap]);

  const getRoleBadge = (node: GraphNode) => {
    if (node.isVictim) {
      return {
        label: '🩸 Victim',
        className: 'bg-[#FF1493] text-white border-[#FF1493]',
      };
    }
    if (revealPlotRoles && node.plotRole === 'killer') {
      return {
        label: '🔪 Killer',
        className: 'bg-red-600 text-white border-red-500',
      };
    }
    if (revealPlotRoles && node.plotRole === 'assistant') {
      return {
        label: '🤝 Accomplice',
        className: 'bg-amber-500 text-slate-950 border-amber-400',
      };
    }
    return {
      label: '🕵️ Suspect',
      className: isDark
        ? 'bg-slate-800 text-slate-300 border-white/15'
        : 'bg-slate-100 text-slate-600 border-slate-200',
    };
  };

  return (
    <div
      className={`w-full rounded-[2rem] border overflow-hidden transition-all ${
        isDark
          ? 'bg-slate-950/90 border-white/10 text-slate-100 shadow-2xl print:bg-white print:text-slate-900 print:border-slate-300'
          : 'bg-white border-slate-200/80 text-slate-900 shadow-sm'
      }`}
    >
      {/* Top Toolbar: Filter Pills & Legend */}
      <div
        className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'border-white/10 bg-slate-900/60 print:bg-slate-50 print:border-slate-200'
            : 'border-slate-100 bg-slate-50/70'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all' as BondCategory, label: `All Bonds (${links.length})`, dot: null },
            { id: 'romantic' as BondCategory, label: 'Romantic', dot: '#FF3366' },
            { id: 'family' as BondCategory, label: 'Family', dot: '#3B82F6' },
            { id: 'social' as BondCategory, label: 'Social & Rivals', dot: '#F59E0B' },
            { id: 'work' as BondCategory, label: 'Work & Business', dot: '#6366F1' },
          ].map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                  active
                    ? 'bg-brand-pink text-white border-brand-pink shadow-xs'
                    : isDark
                    ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {tab.dot && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? '#FFFFFF' : tab.dot }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setShowAllEdgeLabels((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
              showAllEdgeLabels
                ? isDark
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-slate-900 text-white border-slate-900'
                : isDark
                ? 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'
            }`}
          >
            {showAllEdgeLabels ? '🏷️ Hide Line Labels' : '🏷️ Show All Line Labels'}
          </button>

          {selectedCharId && (
            <button
              type="button"
              onClick={() => setSelectedCharId(null)}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-pink/15 text-brand-pink border border-brand-pink/30 hover:bg-brand-pink hover:text-white transition-all cursor-pointer"
            >
              ✕ Clear Focus
            </button>
          )}
        </div>
      </div>

      {/* Helper Sub-Bar */}
      <div
        className={`px-5 py-2 text-[11px] font-medium flex flex-wrap items-center justify-between gap-2 border-b ${
          isDark
            ? 'bg-slate-950/50 border-white/5 text-slate-400 print:hidden'
            : 'bg-white border-slate-100 text-slate-500 print:hidden'
        }`}
      >
        <span>
          👆 <strong>Tip:</strong> Click any character to isolate their direct connections and read
          their relationship notes below.
        </span>
        {revealPlotRoles && (
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF1493]" /> Victim (Center)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" /> Killer
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Accomplice
            </span>
          </div>
        )}
      </div>

      {/* Interactive Radial Web Canvas (SVG Curves + Crisp HTML Node Cards) */}
      <div className="w-full overflow-x-auto">
        <div
          className={`relative w-full min-w-[680px] aspect-[16/10] max-h-[640px] select-none ${
            isDark
              ? 'bg-[radial-gradient(circle_at_center,rgba(255,20,147,0.07)_0%,transparent_70%)] print:bg-white'
              : 'bg-[radial-gradient(circle_at_center,rgba(255,20,147,0.04)_0%,rgba(248,250,252,0.8)_75%)]'
          }`}
        >
          {/* Subtle Concentric Guide Rings */}
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <ellipse
              cx={CENTER_X}
              cy={CENTER_Y}
              rx={370}
              ry={223}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'}
              strokeWidth={1.5}
              strokeDasharray="6 6"
            />
            <ellipse
              cx={CENTER_X}
              cy={CENTER_Y}
              rx={185}
              ry={112}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'}
              strokeWidth={1}
              strokeDasharray="4 6"
            />

            {/* Connection Curves */}
            {renderedPaths.map(({ link, pathD, isHighlighted, isDirectFocus }) => (
              <g key={link.key}>
                {/* Subtle outer glow for active focus lines */}
                {isDirectFocus && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={link.color}
                    strokeWidth={8}
                    strokeOpacity={0.18}
                    strokeLinecap="round"
                  />
                )}
                <path
                  d={pathD}
                  fill="none"
                  stroke={link.color}
                  strokeWidth={isDirectFocus ? 3.2 : isHighlighted ? 2.2 : 1.2}
                  strokeOpacity={isDirectFocus ? 0.95 : isHighlighted ? 0.65 : 0.12}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </g>
            ))}
          </svg>

          {/* Edge Dynamic Pill Badges (Shown when a character is focused/hovered OR when "Show All Line Labels" is toggled on) */}
          {(activeFocusCharId || showAllEdgeLabels) &&
            renderedPaths.map(({ link, labelX, labelY, isDirectFocus, isHighlighted }) => {
              if (!isDirectFocus && !showAllEdgeLabels) return null;
              if (!isHighlighted) return null;

              const leftPct = (labelX / SVG_WIDTH) * 100;
              const topPct = (labelY / SVG_HEIGHT) * 100;

              return (
                <div
                  key={`label-${link.key}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    borderColor: link.color,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm whitespace-nowrap transition-all ${
                    isDark
                      ? 'bg-slate-950/95 text-white print:bg-white print:text-slate-900'
                      : 'bg-white/95 text-slate-800'
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                    style={{ backgroundColor: link.color }}
                  />
                  {link.primaryDynamic}
                </div>
              );
            })}

          {/* Character Node Cards */}
          {nodes.map((node) => {
            const isSelected = selectedCharId === node.id;
            const isConnected = !focusedConnectedIds || focusedConnectedIds.has(node.id);
            const badge = getRoleBadge(node);

            return (
              <button
                key={node.id}
                type="button"
                onClick={() =>
                  setSelectedCharId((prev) => (prev === node.id ? null : node.id))
                }
                onMouseEnter={() => setHoveredCharId(node.id)}
                onMouseLeave={() => setHoveredCharId(null)}
                style={{
                  left: `${node.xPct}%`,
                  top: `${node.yPct}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? 'scale-110 z-30'
                    : isConnected
                    ? 'hover:scale-105'
                    : 'opacity-25 hover:opacity-75'
                }`}
              >
                <div
                  className={`flex flex-col items-center px-3 py-2 rounded-2xl border transition-all min-w-[116px] max-w-[148px] ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-900 border-brand-pink ring-4 ring-brand-pink/30 shadow-xl'
                        : 'bg-white border-brand-pink ring-4 ring-brand-pink/25 shadow-xl'
                      : node.isVictim
                      ? isDark
                        ? 'bg-slate-900/95 border-[#FF1493]/60 ring-2 ring-[#FF1493]/25 shadow-lg print:bg-white'
                        : 'bg-white border-[#FF1493]/50 ring-2 ring-[#FF1493]/15 shadow-md'
                      : isDark
                      ? 'bg-slate-900/90 border-white/15 hover:border-white/35 shadow-lg print:bg-white print:border-slate-300'
                      : 'bg-white/95 border-slate-200 hover:border-slate-300 shadow-md'
                  }`}
                >
                  {/* Top Role Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border mb-1.5 ${badge.className}`}
                  >
                    {badge.label}
                  </span>

                  {/* Avatar Circle */}
                  <div
                    className="w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 mb-1.5 shadow-inner"
                    style={{ borderColor: node.color }}
                  >
                    {node.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={node.avatarUrl}
                        alt={node.roleTitle}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span
                        className="w-full h-full flex items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: node.color }}
                      >
                        {node.initials}
                      </span>
                    )}
                  </div>

                  {/* Role Title */}
                  <span
                    className={`text-[11px] font-black leading-tight text-center truncate w-full ${
                      isDark ? 'text-white print:text-slate-900' : 'text-slate-900'
                    }`}
                  >
                    {node.roleTitle}
                  </span>

                  {/* Cast Guest Name or Bond Count */}
                  {node.guestName ? (
                    <span className="text-[9px] font-bold text-emerald-500 truncate w-full text-center mt-0.5">
                      👤 {node.guestName}
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] font-bold mt-0.5 ${
                        isDark ? 'text-slate-400 print:text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {node.connectionCount} {node.connectionCount === 1 ? 'bond' : 'bonds'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Character Selector Bar + Detailed Connection Breakdown */}
      <div
        className={`p-5 border-t space-y-4 ${
          isDark
            ? 'border-white/10 bg-slate-900/40 print:bg-slate-50 print:border-slate-200'
            : 'border-slate-100 bg-slate-50/50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              isDark ? 'text-slate-400 print:text-slate-600' : 'text-slate-400'
            }`}
          >
            {selectedNode
              ? `🕸️ Showing ${getCharacterDisplayName(selectedNode.char)}'s Direct Web (${selectedNodeConnections.length} Connections)`
              : '🔍 Inspect Character Connections:'}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {nodes.map((n) => {
              const active = selectedCharId === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedCharId((prev) => (prev === n.id ? null : n.id))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    active
                      ? 'bg-brand-pink text-white border-brand-pink'
                      : isDark
                      ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {n.isVictim ? '🩸 ' : ''}
                  {n.roleTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Character's 1-on-1 Relationship Notes */}
        {selectedNode && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 animate-in fade-in duration-200">
            {selectedNodeConnections.length === 0 ? (
              <div
                className={`col-span-full p-4 rounded-xl border text-xs font-medium text-center ${
                  isDark
                    ? 'bg-slate-950/60 border-white/10 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                No recorded bonds for {selectedNode.roleTitle}.
              </div>
            ) : (
              selectedNodeConnections.map(({ link, otherNode }) => (
                <div
                  key={link.key}
                  className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDark
                      ? 'bg-slate-950/80 border-white/10 print:bg-white print:border-slate-300'
                      : 'bg-white border-slate-200/90 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center"
                        style={{ borderColor: otherNode.color }}
                      >
                        {otherNode.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={otherNode.avatarUrl}
                            alt={otherNode.roleTitle}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span
                            className="w-full h-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ backgroundColor: otherNode.color }}
                          >
                            {otherNode.initials}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-black truncate ${
                            isDark ? 'text-white print:text-slate-900' : 'text-slate-900'
                          }`}
                        >
                          {otherNode.roleTitle}
                        </p>
                        {otherNode.guestName && (
                          <p className="text-[10px] font-bold text-emerald-500 truncate">
                            Cast: {otherNode.guestName}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shrink-0"
                      style={{ backgroundColor: link.color }}
                    >
                      {link.primaryDynamic}
                    </span>
                  </div>

                  {link.notes.length > 0 && (
                    <p
                      className={`text-xs leading-relaxed ${
                        isDark ? 'text-slate-300 print:text-slate-700' : 'text-slate-600'
                      }`}
                    >
                      {hydrateTextWithCharacters(link.notes.join(' '), characters, 'print')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
