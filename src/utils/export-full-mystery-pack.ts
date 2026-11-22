import {
  inferClueFormat,
  stripCustomerFacingTitle,
  stripFormatTagFromNotes,
} from '@/utils/clue-format';
import {
  getCharacterRoleTitle,
  hydrateTextWithCharacters,
} from '@/utils/hydration';

export interface ExportPackCharacter {
  id: string;
  name: string;
  displayRoleTitle?: string;
  displayName?: string;
  gender?: string;
  is_victim?: boolean;
  plot_role?: string;
  archetype?: string;
  profile_data?: Record<string, any>;
  motives?: Array<{
    id?: string;
    motive_type?: string;
    strength?: string;
    notes?: string;
    description?: string;
  }>;
  assignedFriend?: {
    id: string;
    name: string;
    gender?: string;
    avatar_url?: string;
    photoUrl?: string | null;
  } | null;
}

export interface ExportFullMysteryPackParams {
  mystery: any;
  activeCharacters: ExportPackCharacter[];
  relationships: any[];
  subplots: any[];
  plotBeats: any[];
  cluesByRound: Record<number, any[]>;
  useFriendNames: boolean;
  includeXRaySpoilers?: boolean;
  getPortraitUrl?: (char: any) => string | null;
}

function escapeHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return trimmed;
}

function formatBadgeLabel(format: string): string {
  switch (format) {
    case 'chat':
      return '💬 Phone Text / Chat';
    case 'cctv':
      return '📹 Security CCTV Still';
    case 'audio':
      return '🎙️ Audio Recording / Voicemail';
    case 'physical_prop':
      return '📸 Crime Scene Visual Exhibit';
    case 'medical_rx':
      return '💊 Medical / Prescription Exhibit';
    case 'handwritten_note':
      return '✍️ Handwritten Note / Polaroid Back';
    case 'search_log':
      return '⚡ Smart-Home / Digital Log';
    case 'document':
      return '📁 Forensic / Official Report';
    case 'social_post':
      return '📱 Social Media Post';
    default:
      return `🔍 ${format.replace(/_/g, ' ').toUpperCase()}`;
  }
}

export function buildFullMysteryPackHtml({
  mystery,
  activeCharacters,
  relationships,
  subplots,
  plotBeats,
  cluesByRound,
  useFriendNames,
  includeXRaySpoilers = true,
  getPortraitUrl,
}: ExportFullMysteryPackParams): string {
  const hydrate = (text?: string | null) => {
    if (!text) return '';
    return hydrateTextWithCharacters(
      text,
      activeCharacters as any[],
      useFriendNames ? 'print' : 'role'
    );
  };

  const resolveCharPortrait = (c: ExportPackCharacter): string | null => {
    if (getPortraitUrl) {
      const p = getPortraitUrl(c);
      if (p) return resolveAbsoluteUrl(p);
    }
    const pd = c.profile_data || {};
    const candidate =
      pd.standard_character_photo_url ||
      pd.outfit_image_url ||
      pd.friend_photo_url ||
      c.assignedFriend?.photoUrl ||
      pd.outfit_reference_images?.[0] ||
      pd.avatar_url ||
      null;
    return resolveAbsoluteUrl(candidate);
  };

  const victimChar = activeCharacters.find((c) => c.is_victim || c.plot_role === 'victim');
  const killerChar = activeCharacters.find((c) => c.plot_role === 'killer');
  const allClues = [
    ...(cluesByRound[1] || []),
    ...(cluesByRound[2] || []),
    ...(cluesByRound[3] || []),
  ];

  // Build a lookup map of hydrated clue data for the interactive clue modal when clicking a beat's clue
  const clueModalLookup: Record<
    string,
    {
      id: string;
      round: number;
      title: string;
      formatLabel: string;
      imageUrl: string | null;
      audioUrl: string | null;
      description: string;
      internalNotes: string;
      isFake: boolean;
      beatLabel: string;
    }
  > = {};

  allClues.forEach((clue) => {
    const fmt = clue.format || inferClueFormat(clue);
    const rawTitle = stripCustomerFacingTitle(clue.title) || clue.title || 'Evidence';
    const title = hydrate(rawTitle);
    const desc = hydrate(clue.description || '');
    const imgUrl = resolveAbsoluteUrl(clue.static_image_url);
    const audioUrl = resolveAbsoluteUrl(clue.audio_url);
    const isFake = clue.evidence_status === 'fake' || clue.implication_type === 'red_herring';
    const linkedBeat = (plotBeats || []).find((b: any) => b.id === clue.linked_plot_beat_id);
    const internalNotes = hydrate(stripFormatTagFromNotes(clue.internal_notes || ''));

    clueModalLookup[clue.id] = {
      id: clue.id,
      round: clue.round_number || 1,
      title,
      formatLabel: formatBadgeLabel(fmt),
      imageUrl: imgUrl,
      audioUrl,
      description:
        desc.trim() ||
        'Visual Crime Scene Exhibit — Inspect the photographic evidence above for physical items, locations, and suspect details.',
      internalNotes,
      isFake,
      beatLabel: isFake
        ? '🎭 Red Herring / Subplot'
        : `✓ Real Canon${linkedBeat ? ` • Beat ${linkedBeat.beat_number}` : ''}`,
    };
  });

  // 1. Cast Roster Rows (with clickable Character Portrait thumbnail)
  const castRosterRowsHtml = activeCharacters
    .map((c) => {
      const roleTitle = c.displayRoleTitle || getCharacterRoleTitle(c) || c.name;
      const friendName = useFriendNames && c.assignedFriend?.name ? c.assignedFriend.name : '—';
      const portraitUrl = resolveCharPortrait(c);
      const plotRole = c.is_victim || c.plot_role === 'victim'
        ? '<span class="badge badge-victim">🩸 Victim</span>'
        : c.plot_role === 'killer'
        ? '<span class="badge badge-killer xray-only">🔪 Killer</span><span class="badge badge-suspect player-only">🎭 Suspect</span>'
        : '<span class="badge badge-suspect">🎭 Suspect</span>';
      const color = c.profile_data?.color || 'Classic';
      const traits = Array.isArray(c.profile_data?.traits)
        ? c.profile_data.traits.join(' • ')
        : '';

      return `
        <tr>
          <td>
            ${
              portraitUrl
                ? `<img src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(friendName)}" class="table-portrait" onclick="openImageModal('${escapeHtml(portraitUrl)}', '${escapeHtml(friendName)} — ${escapeHtml(roleTitle)}')" title="Click to enlarge portrait" />`
                : `<div class="table-portrait-placeholder">🕵️</div>`
            }
          </td>
          <td><strong>${escapeHtml(friendName)}</strong></td>
          <td><strong>${escapeHtml(roleTitle)}</strong></td>
          <td>${plotRole}</td>
          <td>${escapeHtml(String(c.gender || 'Adaptable').toUpperCase())}</td>
          <td>${escapeHtml(color)}</td>
          <td class="muted">${escapeHtml(traits)}</td>
        </tr>
      `;
    })
    .join('');

  // 2. Character Dossiers (with LARGE 240px portrait + click-to-zoom)
  const characterCardsHtml = activeCharacters
    .map((c) => {
      const roleTitle = c.displayRoleTitle || getCharacterRoleTitle(c) || c.name;
      const friendName = useFriendNames && c.assignedFriend?.name ? c.assignedFriend.name : null;
      const headingName = friendName ? `${friendName} — ${roleTitle}` : roleTitle;
      const portraitUrl = resolveCharPortrait(c);
      const pd = c.profile_data || {};
      const bio = hydrate(pd.bio || '');
      const actSummary = hydrate(pd.act_summary || '');
      const outfitAdvice = hydrate(pd.outfit_advice || '');
      const actBullets: string[] = Array.isArray(pd.act_bullets)
        ? pd.act_bullets.map((b: string) => hydrate(b))
        : [];
      const motive = Array.isArray(c.motives) && c.motives[0] ? c.motives[0] : null;
      const motiveText = motive ? hydrate(motive.notes || motive.description || '') : '';

      const charRels = (relationships || []).filter(
        (r: any) => r.character_a_id === c.id || r.character_b_id === c.id
      );

      const relItemsHtml = charRels
        .map((r: any) => {
          const otherId = r.character_a_id === c.id ? r.character_b_id : r.character_a_id;
          const otherChar = activeCharacters.find((ac) => ac.id === otherId);
          const otherLabel = otherChar
            ? otherChar.displayName || getCharacterRoleTitle(otherChar) || otherChar.name
            : 'Suspect';
          const dynamics = Array.isArray(r.dynamics)
            ? r.dynamics.join(', ')
            : r.relationship_type || 'Connected';
          const notes = hydrate(r.notes || r.description || '');
          return `
            <div class="rel-item">
              <div class="rel-header">
                <strong>↔ ${escapeHtml(otherLabel)}</strong>
                <span class="rel-tag">${escapeHtml(dynamics)}</span>
              </div>
              ${notes ? `<div class="rel-notes">${escapeHtml(notes)}</div>` : ''}
            </div>
          `;
        })
        .join('');

      const plotBadge =
        c.is_victim || c.plot_role === 'victim'
          ? '<span class="badge badge-victim">🩸 The Victim</span>'
          : c.plot_role === 'killer'
          ? '<span class="badge badge-killer xray-only">🔪 The Killer</span><span class="badge badge-suspect player-only">🎭 Suspect</span>'
          : '<span class="badge badge-suspect">🎭 Suspect</span>';

      return `
        <div class="dossier-card">
          <div class="dossier-top">
            ${
              portraitUrl
                ? `<div class="dossier-avatar-wrap" onclick="openImageModal('${escapeHtml(portraitUrl)}', '${escapeHtml(headingName)}')" title="Click to view full-size character portrait">
                    <img src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(headingName)}" class="dossier-avatar" />
                    <span class="zoom-pill">🔍 Click to Enlarge</span>
                  </div>`
                : `<div class="dossier-avatar-placeholder">🕵️</div>`
            }
            <div class="dossier-title-block">
              <div class="dossier-badges">
                ${plotBadge}
                <span class="badge badge-outline">${escapeHtml(pd.color || 'Signature Look')}</span>
                <span class="badge badge-outline">${escapeHtml(String(c.gender || 'Adaptable').toUpperCase())}</span>
              </div>
              <h3>${escapeHtml(headingName)}</h3>
              ${actSummary ? `<p class="act-summary">${escapeHtml(actSummary)}</p>` : ''}
              <div class="dossier-section" style="margin-top:12px;">
                <h4>📖 Character Backstory &amp; Bio</h4>
                <p>${escapeHtml(bio)}</p>
              </div>
            </div>
          </div>

          ${
            actBullets.length > 0
              ? `
            <div class="dossier-section">
              <h4>🎭 How to Act &amp; Party Prompts</h4>
              <ul class="bullet-list">
                ${actBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            outfitAdvice
              ? `
            <div class="dossier-section">
              <h4>👗 What to Wear (Costume &amp; Props)</h4>
              <p>${escapeHtml(outfitAdvice)}</p>
            </div>
          `
              : ''
          }

          ${
            motiveText
              ? `
            <div class="dossier-section motive-box xray-only">
              <h4>🔥 Secret Motive (${escapeHtml(String(motive?.motive_type || 'Motive').toUpperCase())} • ${escapeHtml(String(motive?.strength || 'high').toUpperCase())})</h4>
              <p>${escapeHtml(motiveText)}</p>
            </div>
          `
              : ''
          }

          ${
            relItemsHtml
              ? `
            <div class="dossier-section">
              <h4>🕸️ Connections &amp; Relationships (${charRels.length})</h4>
              <div class="rel-grid">
                ${relItemsHtml}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  // 3. Round 1-3 Clues
  const renderRoundSection = (roundNum: number) => {
    const roundClues = cluesByRound[roundNum] || [];
    const cardsHtml = roundClues
      .map((clue, idx) => {
        const fmt = clue.format || inferClueFormat(clue);
        const rawTitle = stripCustomerFacingTitle(clue.title) || clue.title || `Clue #${idx + 1}`;
        const title = hydrate(rawTitle);
        const desc = hydrate(clue.description || '');
        const imgUrl = resolveAbsoluteUrl(clue.static_image_url);
        const audioUrl = resolveAbsoluteUrl(clue.audio_url);
        const isFake = clue.evidence_status === 'fake' || clue.implication_type === 'red_herring';
        const linkedBeat = (plotBeats || []).find((b: any) => b.id === clue.linked_plot_beat_id);
        const internalNotes = hydrate(stripFormatTagFromNotes(clue.internal_notes || ''));

        const xrayBadge = isFake
          ? `<span class="badge badge-fake xray-only">🎭 Red Herring / Subplot</span>`
          : `<span class="badge badge-real xray-only">✓ Real Canon${linkedBeat ? ` • Beat ${linkedBeat.beat_number}` : ''}</span>`;

        return `
          <div id="clue-${escapeHtml(clue.id)}" class="clue-card ${isFake ? 'clue-fake' : 'clue-real'}">
            <div class="clue-header">
              <div class="clue-meta">
                <span class="clue-round-pill">ROUND ${roundNum} • CLUE #${idx + 1}</span>
                <span class="clue-format-pill">${escapeHtml(formatBadgeLabel(fmt))}</span>
              </div>
              ${xrayBadge}
            </div>

            <h4 class="clue-title">${escapeHtml(title)}</h4>

            ${
              imgUrl
                ? `
              <div class="clue-image-wrap" onclick="openClueModal('${escapeHtml(clue.id)}')" title="Click to open full clue view">
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" class="clue-image" />
              </div>
            `
                : ''
            }

            ${
              audioUrl
                ? `
              <div class="clue-audio-wrap">
                <audio controls src="${escapeHtml(audioUrl)}" style="width:100%;height:36px;"></audio>
              </div>
            `
                : ''
            }

            <div class="clue-body">${
              desc.trim()
                ? escapeHtml(desc)
                : '<span class="muted-italic">Visual Crime Scene Exhibit — Inspect the photographic evidence above for physical items, locations, and suspect details.</span>'
            }</div>

            ${
              internalNotes
                ? `
              <div class="clue-xray-notes xray-only">
                <strong>🔬 Designer / QA Logic:</strong> ${escapeHtml(internalNotes)}
              </div>
            `
                : ''
            }
          </div>
        `;
      })
      .join('');

    return `
      <section id="round-${roundNum}" class="pack-section page-break">
        <div class="section-header">
          <div>
            <span class="section-kicker">Evidence Deck • Round ${roundNum} of 3</span>
            <h2>Round ${roundNum} Clues (${roundClues.length} Cards)</h2>
          </div>
        </div>
        <div class="clues-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  };

  // 4. Master Timeline, Subplots & Final Solution (with CLICKABLE Linked Clues that open the full clue modal!)
  const beatsHtml = (plotBeats || [])
    .map((beat: any, idx: number) => {
      const beatNum = beat.beat_number || idx + 1;
      const title = hydrate(beat.event_title || `Beat ${beatNum}`);
      const desc = hydrate(beat.description || '');
      const linked = allClues.filter((c) => c.linked_plot_beat_id === beat.id);

      return `
        <div class="beat-card">
          <div class="beat-header">
            <span class="badge badge-real">BEAT ${beatNum} • ${escapeHtml(String(beat.timeline_phase || 'STORY').toUpperCase())}</span>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <p>${escapeHtml(desc)}</p>
          ${
            linked.length > 0
              ? `
            <div class="beat-clues">
              <strong style="display:block;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6ee7b7;">🔍 Proved by Clues (Click any clue to view full card &amp; photo):</strong>
              <div class="beat-clue-buttons">
                ${linked
                  .map((lc) => {
                    const cTitle = hydrate(stripCustomerFacingTitle(lc.title) || lc.title);
                    const thumb = resolveAbsoluteUrl(lc.static_image_url);
                    return `
                      <button type="button" class="beat-clue-btn" onclick="openClueModal('${escapeHtml(lc.id)}')">
                        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="beat-clue-thumb" />` : `<span class="beat-clue-icon">🔎</span>`}
                        <span class="beat-clue-text">
                          <strong>Round ${lc.round_number || 1}: ${escapeHtml(cTitle)}</strong>
                          <span class="beat-clue-cta">👁️ Click to view full clue →</span>
                        </span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  const subplotsHtml = (subplots || [])
    .map((sp: any, idx: number) => {
      const title = hydrate(sp.title || `Red Herring Subplot #${idx + 1}`);
      const desc = hydrate(sp.description || '');
      const steps = Array.isArray(sp.subplot_beats || sp.beats)
        ? sp.subplot_beats || sp.beats
        : [];
      const fakeClues = allClues.filter(
        (c) => c.evidence_status === 'fake' || c.implication_type === 'red_herring'
      );

      return `
        <div class="beat-card subplot-card">
          <div class="beat-header">
            <span class="badge badge-fake">RED HERRING SUBPLOT #${idx + 1}</span>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <p>${escapeHtml(desc)}</p>
          ${
            steps.length > 0
              ? `
            <ul class="bullet-list" style="margin-top:10px;">
              ${steps
                .map(
                  (st: any) =>
                    `<li>${escapeHtml(hydrate(st.description || ''))}</li>`
                )
                .join('')}
            </ul>
          `
              : ''
          }
          ${
            fakeClues.length > 0
              ? `
            <div class="beat-clues" style="margin-top:12px;">
              <strong style="display:block;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#fda4af;">🎭 Red Herring &amp; Alibi Clues (Click to view full clue):</strong>
              <div class="beat-clue-buttons">
                ${fakeClues
                  .map((fc) => {
                    const cTitle = hydrate(stripCustomerFacingTitle(fc.title) || fc.title);
                    const thumb = resolveAbsoluteUrl(fc.static_image_url);
                    return `
                      <button type="button" class="beat-clue-btn" onclick="openClueModal('${escapeHtml(fc.id)}')">
                        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="beat-clue-thumb" />` : `<span class="beat-clue-icon">🎭</span>`}
                        <span class="beat-clue-text">
                          <strong>Round ${fc.round_number || 1}: ${escapeHtml(cTitle)}</strong>
                          <span class="beat-clue-cta">👁️ Click to view full clue →</span>
                        </span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  const killerDisplay = killerChar
    ? killerChar.displayName || getCharacterRoleTitle(killerChar) || killerChar.name
    : 'Unassigned';
  const victimDisplay = victimChar
    ? victimChar.displayName || getCharacterRoleTitle(victimChar) || victimChar.name
    : 'Unassigned';
  const killerMotiveObj = killerChar?.motives?.[0];
  const killerMotiveNotes = killerMotiveObj
    ? hydrate(killerMotiveObj.notes || killerMotiveObj.description || '')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(mystery?.title || 'Murder Mystery')} — Complete Hydrated Pack</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #131b2e;
      --card-alt: #0f1626;
      --border: #23304d;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --pink: #ff1493;
      --emerald: #10b981;
      --rose: #f43f5e;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
      padding-bottom: 80px;
    }
    body.hide-xray .xray-only { display: none !important; }
    body:not(.hide-xray) .player-only { display: none !important; }
    body.hide-xray .player-only { display: inline-flex !important; }

    .sticky-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(11, 15, 25, 0.94);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .nav-links a, .nav-btn {
      color: var(--text);
      text-decoration: none;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 8px 13px;
      border-radius: 10px;
      background: var(--card);
      border: 1px solid var(--border);
      cursor: pointer;
    }
    .nav-links a:hover, .nav-btn:hover {
      border-color: var(--pink);
    }
    .nav-btn-primary {
      background: var(--pink);
      border-color: var(--pink);
      color: #fff;
    }
    .container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .hero-card {
      background: linear-gradient(135deg, #131b2e 0%, #0d1322 100%);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 36px;
      margin-bottom: 36px;
    }
    .kicker {
      color: var(--pink);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      display: block;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 42px;
      font-weight: 900;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    .hero-desc {
      font-size: 16px;
      color: #cbd5e1;
      margin: 0 0 20px 0;
      max-width: 900px;
    }
    .stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .stat-pill {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .pack-section {
      margin-top: 44px;
    }
    .section-header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 14px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .section-kicker {
      color: var(--pink);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
    h2 {
      font-size: 26px;
      font-weight: 900;
      margin: 4px 0 0 0;
    }
    table.cast-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    table.cast-table th, table.cast-table td {
      padding: 13px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      vertical-align: middle;
    }
    table.cast-table th {
      background: rgba(0,0,0,0.25);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }
    .table-portrait {
      width: 68px;
      height: 68px;
      border-radius: 14px;
      object-fit: cover;
      border: 2px solid var(--pink);
      cursor: zoom-in;
      display: block;
    }
    .table-portrait-placeholder {
      width: 68px;
      height: 68px;
      border-radius: 14px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .badge-victim { background: rgba(255, 20, 147, 0.18); color: #ff6ec7; border: 1px solid rgba(255, 20, 147, 0.4); }
    .badge-killer { background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.45); }
    .badge-suspect { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.35); }
    .badge-outline { background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid var(--border); }
    .badge-real { background: rgba(16, 185, 129, 0.18); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-fake { background: rgba(244, 63, 94, 0.18); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4); }

    .dossiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
      gap: 24px;
    }
    .dossier-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      break-inside: avoid;
    }
    .dossier-top {
      display: flex;
      gap: 22px;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 18px;
    }
    .dossier-avatar-wrap {
      position: relative;
      width: 220px;
      height: 220px;
      border-radius: 18px;
      overflow: hidden;
      border: 2px solid var(--pink);
      flex-shrink: 0;
      background: #000;
      cursor: zoom-in;
      box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    }
    .dossier-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .dossier-avatar-wrap:hover .dossier-avatar {
      transform: scale(1.04);
    }
    .zoom-pill {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.78);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .dossier-avatar-placeholder {
      width: 220px;
      height: 220px;
      border-radius: 18px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 54px;
      flex-shrink: 0;
    }
    .dossier-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 6px;
    }
    .dossier-title-block h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
    }
    .act-summary {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #cbd5e1;
      font-style: italic;
    }
    .dossier-section h4 {
      margin: 0 0 6px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--pink);
    }
    .dossier-section p {
      margin: 0;
      font-size: 13.5px;
      color: #e2e8f0;
    }
    .motive-box {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.35);
      padding: 12px 14px;
      border-radius: 12px;
    }
    .bullet-list {
      margin: 0;
      padding-left: 18px;
      font-size: 13.5px;
      color: #e2e8f0;
    }
    .bullet-list li { margin-bottom: 4px; }
    .rel-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .rel-item {
      background: var(--card-alt);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 12.5px;
    }
    .rel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .rel-tag {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
    }
    .rel-notes {
      color: var(--muted);
      margin-top: 3px;
      font-size: 12px;
    }

    .clues-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    .clue-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      break-inside: avoid;
    }
    .clue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .clue-round-pill {
      font-size: 10px;
      font-weight: 900;
      color: var(--pink);
      letter-spacing: 0.08em;
    }
    .clue-format-pill {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      margin-left: 6px;
    }
    .clue-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
    }
    .clue-image-wrap {
      width: 100%;
      aspect-ratio: 4 / 3;
      border-radius: 12px;
      overflow: hidden;
      background: #000;
      border: 1px solid var(--border);
      cursor: zoom-in;
    }
    .clue-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .clue-body {
      background: var(--card-alt);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 13px;
      font-size: 13px;
      white-space: pre-line;
      color: #e2e8f0;
      flex-grow: 1;
    }
    .clue-xray-notes {
      font-size: 11.5px;
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 10px;
      padding: 9px 11px;
    }
    .beat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      break-inside: avoid;
    }
    .beat-header h3 {
      margin: 8px 0 6px 0;
      font-size: 18px;
    }
    .beat-clues {
      margin-top: 12px;
      font-size: 13px;
      background: var(--card-alt);
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .beat-clue-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .beat-clue-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      color: var(--text);
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .beat-clue-btn:hover {
      border-color: var(--pink);
      transform: translateY(-1px);
    }
    .beat-clue-thumb {
      width: 56px;
      height: 44px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
      border: 1px solid var(--border);
    }
    .beat-clue-icon {
      width: 56px;
      height: 44px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .beat-clue-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12.5px;
    }
    .beat-clue-cta {
      font-size: 10.5px;
      color: var(--pink);
      font-weight: 800;
    }
    .muted { color: var(--muted); }
    .muted-italic { color: var(--muted); font-style: italic; }

    /* Interactive Lightbox Modal for Clues & Portraits */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.86);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal-box {
      background: var(--card);
      border: 1px solid var(--pink);
      border-radius: 24px;
      max-width: 680px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      position: relative;
      box-shadow: 0 25px 60px rgba(0,0,0,0.75);
    }
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: rgba(255,255,255,0.1);
      border: 1px solid var(--border);
      color: #fff;
      font-size: 16px;
      font-weight: 900;
      cursor: pointer;
    }

    @media print {
      body {
        background: #fff !important;
        color: #0f172a !important;
        padding: 0;
      }
      .sticky-nav, .modal-backdrop { display: none !important; }
      .hero-card, .dossier-card, .clue-card, .beat-card, table.cast-table, .clue-body, .rel-item {
        background: #fff !important;
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      .hero-desc, .dossier-section p, .bullet-list, .clue-body, .act-summary {
        color: #1e293b !important;
      }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body class="${includeXRaySpoilers ? '' : 'hide-xray'}">
  <div class="sticky-nav">
    <div class="nav-links">
      <a href="#overview">1. Cast Roster</a>
      <a href="#characters">2. Character Dossiers (${activeCharacters.length})</a>
      <a href="#round-1">3. Round 1 Clues (${(cluesByRound[1] || []).length})</a>
      <a href="#round-2">4. Round 2 Clues (${(cluesByRound[2] || []).length})</a>
      <a href="#round-3">5. Round 3 Clues (${(cluesByRound[3] || []).length})</a>
      <a href="#solution" class="xray-only">6. Master Reveal &amp; Timeline</a>
    </div>
    <div class="nav-links">
      <button type="button" class="nav-btn" onclick="document.body.classList.toggle('hide-xray')">
        🔬 Toggle QA X-Ray Spoilers
      </button>
      <button type="button" class="nav-btn nav-btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="container">
    <!-- HERO & CAST TABLE -->
    <section id="overview">
      <div class="hero-card">
        <span class="kicker">Back Pocket Mysteries • Complete Hydrated Mystery Base Pack</span>
        <h1>${escapeHtml(mystery?.title || 'Murder Mystery')}</h1>
        <p class="hero-desc">${escapeHtml(hydrate(mystery?.description || ''))}</p>
        <div class="stats-row">
          <div class="stat-pill">🎭 Theme: ${escapeHtml(mystery?.theme || 'Custom')}</div>
          <div class="stat-pill">👥 Cast: ${activeCharacters.length} Suspects</div>
          <div class="stat-pill">🔍 Evidence: ${allClues.length} Clues (R1: ${(cluesByRound[1] || []).length} • R2: ${(cluesByRound[2] || []).length} • R3: ${(cluesByRound[3] || []).length})</div>
          <div class="stat-pill">🌶️ Spice: ${escapeHtml(String(mystery?.spice_level || 'Spicy').toUpperCase())}</div>
          <div class="stat-pill xray-only">🩸 Victim: ${escapeHtml(victimDisplay)}</div>
          <div class="stat-pill xray-only">🔪 Killer: ${escapeHtml(killerDisplay)}</div>
        </div>
      </div>

      <div class="section-header">
        <div>
          <span class="section-kicker">Section 1 • Master Cast Roster</span>
          <h2>Friend Cast &amp; Character Role Assignments</h2>
        </div>
      </div>

      <table class="cast-table">
        <thead>
          <tr>
            <th>Portrait</th>
            <th>Friend Name</th>
            <th>Character Role</th>
            <th>Plot Role</th>
            <th>Gender</th>
            <th>Color</th>
            <th>Traits</th>
          </tr>
        </thead>
        <tbody>
          ${castRosterRowsHtml}
        </tbody>
      </table>
    </section>

    <!-- CHARACTER DOSSIERS -->
    <section id="characters" class="pack-section page-break">
      <div class="section-header">
        <div>
          <span class="section-kicker">Section 2 • Personalized Character Sheets</span>
          <h2>Complete Character Dossiers &amp; Relationship Web (${activeCharacters.length})</h2>
        </div>
      </div>
      <div class="dossiers-grid">
        ${characterCardsHtml}
      </div>
    </section>

    <!-- ROUND 1, 2, 3 CLUES -->
    ${renderRoundSection(1)}
    ${renderRoundSection(2)}
    ${renderRoundSection(3)}

    <!-- MASTER SOLUTION & TIMELINE -->
    <section id="solution" class="pack-section page-break xray-only">
      <div class="section-header">
        <div>
          <span class="section-kicker">Section 4 • Master Reveal, Timeline &amp; Red Herrings</span>
          <h2>The Master Crime Solution &amp; Beat Matrix</h2>
        </div>
      </div>

      <div class="hero-card" style="margin-bottom:24px;">
        <span class="kicker">🚨 Top Secret Final Reveal</span>
        <h3 style="font-size:24px;margin:0 0 10px 0;">🔪 The Killer: ${escapeHtml(killerDisplay)} &nbsp;|&nbsp; 🩸 The Victim: ${escapeHtml(victimDisplay)}</h3>
        ${killerMotiveNotes ? `<p class="hero-desc" style="margin:0;"><strong>True Motive &amp; Solution:</strong> ${escapeHtml(killerMotiveNotes)}</p>` : ''}
      </div>

      <h3>Chronological Main Plot Beats (${(plotBeats || []).length})</h3>
      ${beatsHtml}

      ${
        subplotsHtml
          ? `
        <h3 style="margin-top:28px;">Double-Duty Red Herring Subplots (${(subplots || []).length})</h3>
        ${subplotsHtml}
      `
          : ''
      }
    </section>
  </div>

  <!-- INTERACTIVE LIGHTBOX MODAL FOR CLUES & CHARACTER PORTRAITS -->
  <div id="pack-modal" class="modal-backdrop" onclick="if(event.target===this)closePackModal()">
    <div class="modal-box">
      <button type="button" class="modal-close" onclick="closePackModal()">✕</button>
      <div id="pack-modal-content"></div>
    </div>
  </div>

  <script>
    const CLUE_LOOKUP = ${JSON.stringify(clueModalLookup)};

    function closePackModal() {
      const m = document.getElementById('pack-modal');
      if (m) m.classList.remove('open');
    }

    function openImageModal(imgUrl, title) {
      const m = document.getElementById('pack-modal');
      const c = document.getElementById('pack-modal-content');
      if (!m || !c) return;
      c.innerHTML =
        '<div style="padding-right:36px;margin-bottom:14px;">' +
          '<span class="kicker">Character Costume Portrait</span>' +
          '<h3 style="margin:0;font-size:22px;">' + title + '</h3>' +
        '</div>' +
        '<img src="' + imgUrl + '" alt="' + title + '" style="width:100%;max-height:70vh;object-fit:contain;border-radius:16px;background:#000;border:1px solid #23304d;" />';
      m.classList.add('open');
    }

    function openClueModal(clueId) {
      const item = CLUE_LOOKUP[clueId];
      if (!item) return;
      const m = document.getElementById('pack-modal');
      const c = document.getElementById('pack-modal-content');
      if (!m || !c) return;

      let html =
        '<div style="padding-right:36px;margin-bottom:12px;">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">' +
            '<span class="clue-round-pill">ROUND ' + item.round + '</span>' +
            '<span class="clue-format-pill">' + item.formatLabel + '</span>' +
            '<span class="badge ' + (item.isFake ? 'badge-fake' : 'badge-real') + '">' + item.beatLabel + '</span>' +
          '</div>' +
          '<h3 style="margin:0;font-size:22px;">' + item.title + '</h3>' +
        '</div>';

      if (item.imageUrl) {
        html +=
          '<div style="width:100%;border-radius:14px;overflow:hidden;background:#000;border:1px solid #23304d;margin-bottom:14px;">' +
            '<img src="' + item.imageUrl + '" alt="" style="width:100%;max-height:420px;object-fit:cover;display:block;" />' +
          '</div>';
      }
      if (item.audioUrl) {
        html +=
          '<div style="margin-bottom:14px;">' +
            '<audio controls src="' + item.audioUrl + '" style="width:100%;height:40px;"></audio>' +
          '</div>';
      }
      html +=
        '<div class="clue-body" style="margin-bottom:12px;">' + item.description + '</div>';
      if (item.internalNotes) {
        html +=
          '<div class="clue-xray-notes"><strong>🔬 Designer / QA Logic:</strong> ' + item.internalNotes + '</div>';
      }
      c.innerHTML = html;
      m.classList.add('open');
    }
  </script>
</body>
</html>`;
}

export function downloadFullMysteryPackHtml(params: ExportFullMysteryPackParams): void {
  if (typeof window === 'undefined') return;
  const html = buildFullMysteryPackHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const slug = String(params.mystery?.title || 'mystery-pack')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = params.useFriendNames ? 'with-friends' : 'base-roles';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-full-pack-${suffix}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
