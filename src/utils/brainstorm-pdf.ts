export type BrainstormPackageTier = 'basic' | 'premium' | 'grand';
export type BrainstormSpiceLevel = '' | 'clean' | 'mild' | 'spicy' | 'filthy';
export type BrainstormComplexity = '' | 'easy' | 'medium' | 'hard';

export interface BrainstormWorksheetOptions {
  tier: BrainstormPackageTier;
  workingTitle?: string;
  theme?: string;
  spiceLevel?: BrainstormSpiceLevel;
  complexity?: BrainstormComplexity;
  settingVibe?: string;
  victimRole?: string;
  killerRole?: string;
  murderMethod?: string;
}

export const BRAINSTORM_SPICE_OPTIONS: {
  value: BrainstormSpiceLevel;
  label: string;
  shortPdf: string;
  sub: string;
}[] = [
  { value: '', label: 'Circle on Sheet', shortPdf: '', sub: 'Leave unchecked to circle by hand' },
  { value: 'clean', label: 'Clean (PG)', shortPdf: 'Clean (PG)', sub: 'Wholesome, family-friendly' },
  { value: 'mild', label: 'Mild (MA15+)', shortPdf: 'Mild (MA15+)', sub: 'Cheeky, light drama & secrets' },
  { value: 'spicy', label: 'Spicy (R18+)', shortPdf: 'Spicy (R18+)', sub: 'Affairs, blackmail, adult themes' },
  { value: 'filthy', label: 'Filthy (NC-17)', shortPdf: 'Filthy (NC-17)', sub: 'Unhinged, wild, OTT chaos' },
];

export const BRAINSTORM_COMPLEXITY_OPTIONS: {
  value: BrainstormComplexity;
  label: string;
}[] = [
  { value: '', label: 'Circle on Sheet' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const BRAINSTORM_TIER_CONFIG: Record<
  BrainstormPackageTier,
  {
    label: string;
    playersLabel: string;
    maxPlayers: number;
    rounds: number;
    extensionGroupsSummary: string;
    description: string;
  }
> = {
  basic: {
    label: 'Basic Package',
    playersLabel: '6 Players (1 Victim + 5 Suspects)',
    maxPlayers: 6,
    rounds: 3,
    extensionGroupsSummary: 'Core 6 Only (No Extension Groups)',
    description:
      'Core 6 relationship web (1 Victim in center + 5 Suspects), Relationship Symbol Legend, 3-Round plot beat sheet, and 6-character motive mapping.',
  },
  premium: {
    label: 'Premium Package',
    playersLabel: '7–10 Players (Core 6 + Pair / Trio / Solo)',
    maxPlayers: 10,
    rounds: 4,
    extensionGroupsSummary: 'Core 6 + Pair (#7–8) + Trio A (#9–11) + Solo A (#12)',
    description:
      'Everything in Basic (expanded to 4 Rounds) PLUS the Extension Groups Worksheet for Pair (#7–8), Trio A (#9–11), and One-Sided Solo (#12).',
  },
  grand: {
    label: 'Grand Package',
    playersLabel: '11–16 Players (Core 6 + All Extension Groups)',
    maxPlayers: 16,
    rounds: 5,
    extensionGroupsSummary:
      'Core 6 + Pair (#7–8) + Trio A (#9–11) + Solo A (#12) + Solo B (#13) + Trio B (#14–16)',
    description:
      'Full 5-Round master kit: Core 6 Web + Pair (#7–8) + Trio A (#9–11) + Solo Wildcards (#12 & #13) + Trio B (#14–16).',
  },
};

// Helper to escape PDF literal strings
function pdfEscape(text: string): string {
  return String(text || '')
    .replace(/•/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/►/g, '>')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Low-level vector PDF canvas for a single Landscape A4 page (842 x 595 pt).
 * Coordinate helper converts top-left (x, y) to PDF bottom-left (x, 595 - y).
 */
class PdfPageCanvas {
  readonly width = 842;
  readonly height = 595;
  private ops: string[] = [];

  private y(topY: number): number {
    return Number((this.height - topY).toFixed(2));
  }

  setStrokeColor(r: number, g: number, b: number) {
    this.ops.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`);
  }

  setFillColor(r: number, g: number, b: number) {
    this.ops.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`);
  }

  setLineWidth(w: number) {
    this.ops.push(`${w.toFixed(2)} w`);
  }

  setDash(dashArray: number[], phase = 0) {
    if (dashArray.length === 0) {
      this.ops.push('[] 0 d');
    } else {
      this.ops.push(`[${dashArray.join(' ')}] ${phase} d`);
    }
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push(`${x1.toFixed(2)} ${this.y(y1)} m ${x2.toFixed(2)} ${this.y(y2)} l S`);
  }

  rect(x: number, topY: number, w: number, h: number, mode: 'S' | 'f' | 'B' = 'S') {
    const pdfY = this.y(topY + h);
    this.ops.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${mode}`);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, mode: 'S' | 'f' | 'B' = 'S') {
    const k = 0.552284749831;
    const ox = rx * k;
    const oy = ry * k;
    const py = this.y(cy);

    this.ops.push(
      `${(cx - rx).toFixed(2)} ${py.toFixed(2)} m`,
      `${(cx - rx).toFixed(2)} ${(py + oy).toFixed(2)} ${(cx - ox).toFixed(2)} ${(py + ry).toFixed(2)} ${cx.toFixed(2)} ${(py + ry).toFixed(2)} c`,
      `${(cx + ox).toFixed(2)} ${(py + ry).toFixed(2)} ${(cx + rx).toFixed(2)} ${(py + oy).toFixed(2)} ${(cx + rx).toFixed(2)} ${py.toFixed(2)} c`,
      `${(cx + rx).toFixed(2)} ${(py - oy).toFixed(2)} ${(cx + ox).toFixed(2)} ${(py - ry).toFixed(2)} ${cx.toFixed(2)} ${(py - ry).toFixed(2)} c`,
      `${(cx - ox).toFixed(2)} ${(py - ry).toFixed(2)} ${(cx - rx).toFixed(2)} ${(py - oy).toFixed(2)} ${(cx - rx).toFixed(2)} ${py.toFixed(2)} c`,
      mode
    );
  }

  text(
    str: string,
    x: number,
    topY: number,
    options?: {
      font?: 'F1' | 'F2'; // F1 = Helvetica, F2 = Helvetica-Bold
      size?: number;
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
    }
  ) {
    const font = options?.font || 'F1';
    const size = options?.size || 10;
    const [r, g, b] = options?.color || [15, 23, 42];
    const clean = pdfEscape(str);

    // Accurate character-by-character Helvetica / Helvetica-Bold width estimation
    let estWidth = 0;
    const isBold = font === 'F2';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (' Iilj|.,:;!\''.includes(ch)) {
        estWidth += size * (isBold ? 0.30 : 0.27);
      } else if ('()[]-/frt'.includes(ch)) {
        estWidth += size * (isBold ? 0.37 : 0.34);
      } else if ('MW%@'.includes(ch)) {
        estWidth += size * (isBold ? 0.90 : 0.85);
      } else if (ch >= 'A' && ch <= 'Z') {
        estWidth += size * (isBold ? 0.70 : 0.66);
      } else if ('&+=<>mw•–—►'.includes(ch)) {
        estWidth += size * (isBold ? 0.72 : 0.68);
      } else {
        estWidth += size * (isBold ? 0.58 : 0.54);
      }
    }

    let drawX = x;
    if (options?.align === 'center') {
      drawX = x - estWidth / 2;
    } else if (options?.align === 'right') {
      drawX = x - estWidth;
    }

    this.setFillColor(r, g, b);
    this.ops.push(
      `BT /${font} ${size.toFixed(1)} Tf ${drawX.toFixed(2)} ${this.y(topY)} Td (${clean}) Tj ET`
    );
  }

  getStream(): string {
    return this.ops.join('\n');
  }
}

function drawWorksheetHeader(
  page: PdfPageCanvas,
  opts: BrainstormWorksheetOptions,
  pageTitle: string,
  pageSubtitle: string,
  pageNum: number,
  totalPages: number
) {
  const cfg = BRAINSTORM_TIER_CONFIG[opts.tier];

  // Top dark header strip (y: 16..52, height: 36)
  page.setFillColor(15, 23, 42);
  page.rect(24, 16, 794, 36, 'f');

  // Brand pink accent bar on left of header
  page.setFillColor(254, 4, 198);
  page.rect(24, 16, 6, 36, 'f');

  page.text(`BACK POCKET MYSTERIES  |  ${pageTitle.toUpperCase()}`, 38, 31, {
    font: 'F2',
    size: 10.5,
    color: [255, 255, 255],
  });

  page.text(pageSubtitle, 38, 44, {
    font: 'F1',
    size: 7.5,
    color: [203, 213, 225],
  });

  // Right badge: Tier + Rounds + Page Number
  const badgeText = `${cfg.label.toUpperCase()}  |  ${cfg.rounds} ROUNDS  |  PAGE ${pageNum}/${totalPages}`;
  page.text(badgeText, 806, 36, {
    font: 'F2',
    size: 8.5,
    color: [254, 4, 198],
    align: 'right',
  });

  // 2-Row Metadata & Mystery Specs Box below header (y: 56..102, height: 46)
  page.setFillColor(248, 250, 252);
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.75);
  page.rect(24, 56, 794, 46, 'B');

  // Horizontal divider separating Row 1 (Title/Theme/Killer/Weapon) & Row 2 (Spice/Complexity/Vibe)
  page.setStrokeColor(226, 232, 240);
  page.setLineWidth(0.6);
  page.line(24, 79, 818, 79);

  // --- ROW 1 (y: 71): WORKING TITLE | THEME / SETTING | KILLER ROLE | WEAPON ---
  page.text('WORKING TITLE:', 32, 71, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  if (opts.workingTitle) {
    page.text(opts.workingTitle, 102, 71, { font: 'F2', size: 9, color: [15, 23, 42] });
  } else {
    page.setStrokeColor(180, 190, 205);
    page.line(102, 73, 268, 73);
  }

  page.text('THEME / SETTING:', 278, 71, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  if (opts.theme) {
    page.text(opts.theme, 356, 71, { font: 'F2', size: 9, color: [15, 23, 42] });
  } else {
    page.setStrokeColor(180, 190, 205);
    page.line(356, 73, 526, 73);
  }

  page.text('KILLER (#__):', 536, 71, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  if (opts.killerRole) {
    page.text(opts.killerRole, 594, 71, { font: 'F2', size: 9, color: [15, 23, 42] });
  } else {
    page.setStrokeColor(180, 190, 205);
    page.line(594, 73, 676, 73);
  }

  page.text('WEAPON:', 686, 71, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  if (opts.murderMethod) {
    page.text(opts.murderMethod, 728, 71, { font: 'F2', size: 9, color: [15, 23, 42] });
  } else {
    page.setStrokeColor(180, 190, 205);
    page.line(728, 73, 810, 73);
  }

  // --- ROW 2 (y: 94): SPICE LEVEL | COMPLEXITY | VIBE / DRESS CODE ---
  page.text('SPICE LEVEL:', 32, 94, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  const spiceItems: { key: BrainstormSpiceLevel; text: string; x: number }[] = [
    { key: 'clean', text: 'Clean (PG)', x: 92 },
    { key: 'mild', text: 'Mild (MA15+)', x: 158 },
    { key: 'spicy', text: 'Spicy (R18+)', x: 234 },
    { key: 'filthy', text: 'Filthy (NC-17)', x: 308 },
  ];
  for (const sp of spiceItems) {
    const checked = opts.spiceLevel === sp.key;
    const mark = checked ? '[X]' : '[ ]';
    page.text(`${mark} ${sp.text}`, sp.x, 94, {
      font: checked ? 'F2' : 'F1',
      size: 7.5,
      color: checked ? [254, 4, 198] : [51, 65, 85],
    });
  }

  // Vertical separator
  page.setStrokeColor(203, 213, 225);
  page.line(388, 82, 388, 99);

  page.text('COMPLEXITY:', 396, 94, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  const compItems: { key: BrainstormComplexity; text: string; x: number }[] = [
    { key: 'easy', text: 'Easy', x: 456 },
    { key: 'medium', text: 'Medium', x: 498 },
    { key: 'hard', text: 'Hard', x: 552 },
  ];
  for (const cp of compItems) {
    const checked = opts.complexity === cp.key;
    const mark = checked ? '[X]' : '[ ]';
    page.text(`${mark} ${cp.text}`, cp.x, 94, {
      font: checked ? 'F2' : 'F1',
      size: 7.5,
      color: checked ? [15, 23, 42] : [51, 65, 85],
    });
  }

  // Vertical separator
  page.setStrokeColor(203, 213, 225);
  page.line(596, 82, 596, 99);

  page.text('VIBE / ERA:', 604, 94, { font: 'F2', size: 7.5, color: [100, 116, 139] });
  if (opts.settingVibe) {
    page.text(opts.settingVibe, 654, 94, { font: 'F2', size: 8.5, color: [15, 23, 42] });
  } else {
    page.setStrokeColor(180, 190, 205);
    page.line(654, 96, 810, 96);
  }
}

/**
 * PAGE 1: Replicates the exact layout of the user's handwritten sheet:
 * - Left Column: Numbered Main Story Beats (1–7) + Round Pacing Box (3, 4, or 5 rounds)
 * - Right Column (Top): Core 6 Relationship Web (Victim oval in center + 5 Suspect ovals around it with open drawing space)
 * - Right Column (Bottom): Victim Shorthand List (H — Wy = Affair style) + Relationship Symbol Key (Siblings, Married, Work, Ex Bestie, Exes, Secret Affair, Friends, Family, Besties)
 */
function buildPage1CoreWebAndBeats(
  opts: BrainstormWorksheetOptions,
  totalPages: number
): PdfPageCanvas {
  const page = new PdfPageCanvas();
  const cfg = BRAINSTORM_TIER_CONFIG[opts.tier];

  drawWorksheetHeader(
    page,
    opts,
    'Core 6 Relationship Web & Main Story Beats',
    `${cfg.playersLabel}  •  Draw character names inside the ovals, connect them with relationship lines, and list the main murder beats on the left.`,
    1,
    totalPages
  );

  // =========================================================================
  // LEFT COLUMN (x: 24..384): MAIN PLOT BEATS (1 to 7) + ROUND CLUE PACING
  // =========================================================================
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(24, 108, 360, 462, 'S');

  // Left section title bar
  page.setFillColor(241, 245, 249);
  page.rect(24.5, 108.5, 359, 22, 'f');
  page.text('1. MAIN PLOT BEATS (CHRONOLOGICAL TIMELINE)', 34, 123, {
    font: 'F2',
    size: 9,
    color: [15, 23, 42],
  });
  page.text('CORE 6 ONLY', 374, 123, {
    font: 'F2',
    size: 7.5,
    color: [254, 4, 198],
    align: 'right',
  });

  // 7 Numbered Beat Slots with 2 generous handwriting lines each
  const beatLabels = [
    '1)',
    '2)',
    '3)',
    '4)',
    '5)',
    '6)',
    '7)',
  ];
  const beatHints = [
    'Opening tension / affair or secret exposed',
    'Weapon or key prop goes missing / changes hands',
    'Public argument or overheard confrontation',
    'The killer makes their move / fatal decision',
    'Red herring suspect spotted near the scene',
    'The Victim is found dead (How & where)',
    'Final clincher twist that exposes the killer',
  ];

  let beatY = 144;
  for (let i = 0; i < beatLabels.length; i++) {
    page.text(beatLabels[i], 34, beatY + 4, {
      font: 'F2',
      size: 11,
      color: [15, 23, 42],
    });
    page.text(beatHints[i], 54, beatY - 6, {
      font: 'F1',
      size: 7,
      color: [148, 163, 184],
    });

    // Two handwriting lines per beat
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.6);
    page.setDash([2, 2]);
    page.line(54, beatY + 8, 372, beatY + 8);
    page.line(54, beatY + 24, 372, beatY + 24);
    page.setDash([]);

    beatY += 44;
  }

  // Round Pacing Footer inside Left Column (3 Rounds for Basic, 4 for Premium, 5 for Grand)
  const roundBoxTop = 450;
  page.setFillColor(248, 250, 252);
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.75);
  page.rect(32, roundBoxTop, 344, 112, 'B');

  page.text(
    `ROUND STRUCTURE (${cfg.rounds} ROUNDS FOR ${cfg.label.toUpperCase()})`,
    40,
    roundBoxTop + 14,
    {
      font: 'F2',
      size: 8,
      color: [15, 23, 42],
    }
  );

  const roundRowHeight = Math.floor(88 / cfg.rounds);
  for (let r = 1; r <= cfg.rounds; r++) {
    const ry = roundBoxTop + 22 + (r - 1) * roundRowHeight;
    page.text(`R${r}:`, 40, ry + 10, {
      font: 'F2',
      size: 8.5,
      color: [254, 4, 198],
    });
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.5);
    page.line(60, ry + 11, 366, ry + 11);
  }

  // =========================================================================
  // RIGHT COLUMN TOP (x: 396..818, y: 108..434): CORE 6 RELATIONSHIP WEB
  // =========================================================================
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(396, 108, 422, 324, 'S');

  page.setFillColor(241, 245, 249);
  page.rect(396.5, 108.5, 421, 22, 'f');
  page.text('2. CORE 6 CHARACTER & RELATIONSHIP WEB', 406, 123, {
    font: 'F2',
    size: 8.5,
    color: [15, 23, 42],
  });
  page.text('1 VICTIM (CENTER) + 5 SUSPECTS', 810, 123, {
    font: 'F2',
    size: 7.5,
    color: [100, 116, 139],
    align: 'right',
  });

  // Center Oval: #1 VICTIM (Large double-ring oval in the middle, just like "Husband")
  const webCx = 607;
  const webCy = 264;
  page.setFillColor(255, 255, 255);
  page.setStrokeColor(15, 23, 42);
  page.setLineWidth(1.8);
  page.ellipse(webCx, webCy, 54, 28, 'B');
  page.setLineWidth(0.6);
  page.ellipse(webCx, webCy, 50, 24, 'S');
  page.text('#1 VICTIM', webCx, webCy - 11, {
    font: 'F2',
    size: 7,
    color: [254, 4, 198],
    align: 'center',
  });
  if (opts.victimRole) {
    page.text(opts.victimRole, webCx, webCy + 5, {
      font: 'F2',
      size: 9.5,
      color: [15, 23, 42],
      align: 'center',
    });
  }

  // 5 Surrounding Suspect Ovals arranged around the Victim with generous margin all around for outer lines
  const suspectNodes = [
    { num: '#2 SUSPECT', cx: 480, cy: 172 }, // Top-Left
    { num: '#3 SUSPECT', cx: 734, cy: 172 }, // Top-Right
    { num: '#4 SUSPECT', cx: 750, cy: 298 }, // Bottom-Right
    { num: '#5 SUSPECT', cx: 607, cy: 374 }, // Bottom-Center (leaves 36pt below for outer lines!)
    { num: '#6 SUSPECT', cx: 464, cy: 298 }, // Bottom-Left
  ];

  for (const node of suspectNodes) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(node.cx, node.cy, 45, 22, 'B');
    page.text(node.num, node.cx, node.cy - 9, {
      font: 'F2',
      size: 6.5,
      color: [100, 116, 139],
      align: 'center',
    });
  }

  // =========================================================================
  // RIGHT COLUMN BOTTOM (x: 396..818, y: 440..570):
  // Left Box: Victim Shorthand Connections (H — Wy = Affair)
  // Right Box: Relationship Symbol Key (matching the user's exact symbols!)
  // =========================================================================
  // 1) Victim Shorthand Box (x: 396..592)
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(396, 440, 196, 130, 'S');
  page.setFillColor(241, 245, 249);
  page.rect(396.5, 440.5, 195, 18, 'f');
  page.text('VICTIM SHORTHAND (V — #)', 404, 452, {
    font: 'F2',
    size: 7.5,
    color: [15, 23, 42],
  });

  for (let s = 2; s <= 6; s++) {
    const sy = 472 + (s - 2) * 20;
    page.text(`V`, 404, sy, { font: 'F2', size: 8.5, color: [254, 4, 198] });
    page.setStrokeColor(100, 116, 139);
    page.setLineWidth(0.8);
    page.line(415, sy - 3, 435, sy - 3);
    page.text(`#${s} =`, 440, sy, { font: 'F2', size: 8.5, color: [15, 23, 42] });
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.6);
    page.line(464, sy + 1, 584, sy + 1);
  }

  // 2) Relationship Symbol Legend Box (x: 600..818)
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(600, 440, 218, 130, 'S');
  page.setFillColor(241, 245, 249);
  page.rect(600.5, 440.5, 217, 18, 'f');
  page.text('RELATIONSHIP LINE KEY', 608, 452, {
    font: 'F2',
    size: 7.5,
    color: [15, 23, 42],
  });

  // Two columns of 5 symbols inside the legend box (matching user's exact handwritten key)
  const legendItems: Array<{ label: string; draw: (x: number, y: number) => void }> = [
    {
      label: 'Siblings',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.ellipse(x, y, 2, 2, 'f');
        page.ellipse(x + 26, y, 2, 2, 'f');
      },
    },
    {
      label: 'Married',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.ellipse(x + 13, y, 3, 3, 'f');
      },
    },
    {
      label: 'Work / Co-Worker',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.text('z', x + 3, y + 2, { font: 'F2', size: 7 });
        page.text('z', x + 19, y + 2, { font: 'F2', size: 7 });
      },
    },
    {
      label: 'Ex Bestie',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.line(x + 4, y - 3, x + 4, y + 3);
        page.line(x + 22, y - 3, x + 22, y + 3);
      },
    },
    {
      label: 'Exes',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.line(x + 6, y - 3, x + 6, y + 3);
        page.line(x + 9, y - 3, x + 9, y + 3);
        page.line(x + 17, y - 3, x + 17, y + 3);
        page.line(x + 20, y - 3, x + 20, y + 3);
      },
    },
    {
      label: 'Secret Affair',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.text('N', x + 2, y + 2.5, { font: 'F2', size: 6.5 });
        page.text('N', x + 19, y + 2.5, { font: 'F2', size: 6.5 });
      },
    },
    {
      label: 'Friends',
      draw: (x, y) => {
        page.line(x + 2, y, x + 24, y);
        page.ellipse(x + 2, y, 2.2, 2.2, 'S');
        page.ellipse(x + 24, y, 2.2, 2.2, 'S');
      },
    },
    {
      label: 'Family / In-Law',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.text('<', x - 1, y + 2.5, { font: 'F2', size: 7 });
        page.text('>', x + 23, y + 2.5, { font: 'F2', size: 7 });
      },
    },
    {
      label: 'Besties',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.rect(x - 1, y - 2, 4, 4, 'f');
        page.rect(x + 23, y - 2, 4, 4, 'f');
      },
    },
    {
      label: 'Rival / Blackmail',
      draw: (x, y) => {
        page.line(x, y, x + 26, y);
        page.text('X', x + 11, y + 2.5, { font: 'F2', size: 7 });
      },
    },
  ];

  legendItems.forEach((item, idx) => {
    const col = idx < 5 ? 0 : 1;
    const row = idx % 5;
    const lx = col === 0 ? 608 : 714;
    const ly = 470 + row * 20;

    page.setStrokeColor(15, 23, 42);
    page.setFillColor(15, 23, 42);
    page.setLineWidth(0.9);
    item.draw(lx, ly - 3);

    page.text(item.label, lx + 32, ly, {
      font: 'F1',
      size: 7.5,
      color: [30, 41, 59],
    });
  });

  return page;
}

/**
 * PAGE 2: CORE 6 CHARACTER ROSTER, GENDER & MOTIVES WORKSHEET
 */
function buildPage2CoreCharacterCards(
  opts: BrainstormWorksheetOptions,
  totalPages: number
): PdfPageCanvas {
  const page = new PdfPageCanvas();
  const cfg = BRAINSTORM_TIER_CONFIG[opts.tier];

  drawWorksheetHeader(
    page,
    opts,
    'Core 6 Character Profiles, Motives & Clues',
    `Fill in the 6 mandatory roles (#1 Victim + #2–#6 Core Suspects). Circle F / M / Adaptable for each role.`,
    2,
    totalPages
  );

  const roles = [
    { badge: '#1 THE VICTIM', sub: 'Center of the web', accent: [254, 4, 198] as [number, number, number] },
    { badge: '#2 CORE SUSPECT (OR KILLER)', sub: 'Mandatory Role', accent: [15, 23, 42] as [number, number, number] },
    { badge: '#3 CORE SUSPECT', sub: 'Mandatory Role', accent: [15, 23, 42] as [number, number, number] },
    { badge: '#4 CORE SUSPECT', sub: 'Mandatory Role', accent: [15, 23, 42] as [number, number, number] },
    { badge: '#5 CORE SUSPECT', sub: 'Mandatory Role', accent: [15, 23, 42] as [number, number, number] },
    { badge: '#6 CORE SUSPECT', sub: 'Mandatory Role', accent: [15, 23, 42] as [number, number, number] },
  ];

  const cardW = 256;
  const cardH = 224;
  const gapX = 13;
  const gapY = 14;

  roles.forEach((role, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 24 + col * (cardW + gapX);
    const y = 108 + row * (cardH + gapY);

    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.8);
    page.rect(x, y, cardW, cardH, 'S');

    // Card header strip
    page.setFillColor(role.accent[0], role.accent[1], role.accent[2]);
    page.rect(x, y, cardW, 20, 'f');
    page.text(role.badge, x + 8, y + 13, {
      font: 'F2',
      size: 8.5,
      color: [255, 255, 255],
    });
    page.text('F / M / ADAPT', x + cardW - 8, y + 13, {
      font: 'F2',
      size: 7,
      color: [226, 232, 240],
      align: 'right',
    });

    const fields = [
      { label: 'Role Title (e.g. The Sister):', lines: 1 },
      { label: 'Vibe / Personality & Costume:', lines: 2 },
      { label: 'Big Secret / Motive:', lines: 2 },
      { label: `Alibi & Key Clue (R1–R${cfg.rounds}):`, lines: 2 },
    ];

    let fy = y + 34;
    for (const f of fields) {
      page.text(f.label, x + 8, fy, {
        font: 'F2',
        size: 7.5,
        color: [71, 85, 105],
      });
      fy += 14;
      for (let l = 0; l < f.lines; l++) {
        page.setStrokeColor(203, 213, 225);
        page.setLineWidth(0.5);
        page.setDash([2, 2]);
        page.line(x + 8, fy, x + cardW - 8, fy);
        page.setDash([]);
        fy += 16;
      }
      fy += 2;
    }
  });

  return page;
}

/**
 * PAGE 3 (For Premium 7–10p & Grand 11–16p):
 * Extension Groups Worksheet:
 * - Left: PAIR (#7 & #8) 2-Person Mini-Web + Core 6 Hook
 * - Middle: TRIO A (#9, #10, #11) 3-Person Triangle Mini-Web + Core 6 Hook
 * - Right: SOLO WILDCARDS (#12 & #13) One-Sided Core 6 Hooks
 */
function buildPage3ExtensionGroups1(
  opts: BrainstormWorksheetOptions,
  totalPages: number
): PdfPageCanvas {
  const page = new PdfPageCanvas();

  drawWorksheetHeader(
    page,
    opts,
    'Extension Character Groups (#7–#12) — Pair, Trio & Solo Hooks',
    `Pairs & Trios always enter the game together as a unit. Solos tie into the Core 6 in a one-sided way so Core 6 bios never change.`,
    3,
    totalPages
  );

  // =========================================================================
  // COLUMN 1 (x: 24..278): EXTENSION GROUP A — THE PAIR (#7 & #8)
  // =========================================================================
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(24, 108, 254, 462, 'S');
  page.setFillColor(15, 23, 42);
  page.rect(24, 108, 254, 22, 'f');
  page.text('GROUP A: THE PAIR (#7 & #8)', 32, 122, {
    font: 'F2',
    size: 8.5,
    color: [255, 255, 255],
  });
  page.text('+2 PLAYERS (8p / 11p / 14p+)', 270, 122, {
    font: 'F2',
    size: 7,
    color: [254, 4, 198],
    align: 'right',
  });

  // Two Ovals for #7 and #8 with space to draw their 2-way line
  page.setFillColor(255, 255, 255);
  page.setStrokeColor(15, 23, 42);
  page.setLineWidth(1.4);
  page.ellipse(86, 186, 46, 24, 'B');
  page.text('#7 SUSPECT', 86, 175, { font: 'F2', size: 6.5, color: [100, 116, 139], align: 'center' });

  page.ellipse(216, 186, 46, 24, 'B');
  page.text('#8 SUSPECT', 216, 175, { font: 'F2', size: 6.5, color: [100, 116, 139], align: 'center' });

  // Dashed guide line between #7 and #8
  page.setStrokeColor(148, 163, 184);
  page.setDash([3, 3]);
  page.line(132, 186, 170, 186);
  page.setDash([]);
  page.text('2-Way Dynamic', 151, 180, {
    font: 'F1',
    size: 6.5,
    color: [100, 116, 139],
    align: 'center',
  });

  // Write-in lines for #7 & #8
  const pairPrompts = [
    '#7 Role Title & Gender (F/M/Adapt):',
    '#8 Role Title & Gender (F/M/Adapt):',
    'Their Shared 2-Way Secret / Drama:',
    'How #7/#8 Hook Into Core 6 (One-Sided):',
    'Subplot Clue(s) Dropped in Game:',
  ];
  let py = 236;
  for (const label of pairPrompts) {
    page.text(label, 34, py, { font: 'F2', size: 7.5, color: [71, 85, 105] });
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.5);
    page.setDash([2, 2]);
    page.line(34, py + 15, 268, py + 15);
    page.line(34, py + 31, 268, py + 31);
    page.setDash([]);
    py += 64;
  }

  // =========================================================================
  // COLUMN 2 (x: 291..551): EXTENSION GROUP B — TRIO A (#9, #10 & #11)
  // =========================================================================
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(291, 108, 260, 462, 'S');
  page.setFillColor(15, 23, 42);
  page.rect(291, 108, 260, 22, 'f');
  page.text('GROUP B: TRIO A (#9, #10 & #11)', 299, 122, {
    font: 'F2',
    size: 8.5,
    color: [255, 255, 255],
  });
  page.text('+3 PLAYERS (9p / 10p / 11p+)', 543, 122, {
    font: 'F2',
    size: 7,
    color: [254, 4, 198],
    align: 'right',
  });

  // Triangle of 3 Ovals (#9 Top, #10 Bottom-Left, #11 Bottom-Right)
  const trioNodes = [
    { label: '#9 SUSPECT', cx: 421, cy: 162 },
    { label: '#10 SUSPECT', cx: 350, cy: 234 },
    { label: '#11 SUSPECT', cx: 492, cy: 234 },
  ];
  page.setStrokeColor(203, 213, 225);
  page.setDash([3, 3]);
  page.line(395, 180, 365, 212);
  page.line(447, 180, 477, 212);
  page.line(394, 234, 448, 234);
  page.setDash([]);

  for (const tn of trioNodes) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(tn.cx, tn.cy, 44, 21, 'B');
    page.text(tn.label, tn.cx, tn.cy - 9, {
      font: 'F2',
      size: 6.5,
      color: [100, 116, 139],
      align: 'center',
    });
  }

  const trioPrompts = [
    '#9, #10 & #11 Role Titles & Genders:',
    'Their 3-Way Triangle Conflict / Secret:',
    'How This Trio Hooks Into Core 6:',
    'Subplot Clue(s) Dropped in Game:',
  ];
  let ty = 278;
  for (const label of trioPrompts) {
    page.text(label, 301, ty, { font: 'F2', size: 7.5, color: [71, 85, 105] });
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.5);
    page.setDash([2, 2]);
    page.line(301, ty + 16, 541, ty + 16);
    page.line(301, ty + 33, 541, ty + 33);
    page.line(301, ty + 50, 541, ty + 50);
    page.setDash([]);
    ty += 72;
  }

  // =========================================================================
  // COLUMN 3 (x: 564..818): SOLO WILDCARDS (#12 & #13 — ONE-SIDED HOOKS)
  // =========================================================================
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(564, 108, 254, 462, 'S');
  page.setFillColor(15, 23, 42);
  page.rect(564, 108, 254, 22, 'f');
  page.text('GROUP C: SOLO WILDCARDS (#12 & #13)', 572, 122, {
    font: 'F2',
    size: 8.5,
    color: [255, 255, 255],
  });
  page.text('+1 ODD FILLERS (7p / 10p / 13p+)', 810, 122, {
    font: 'F2',
    size: 6.8,
    color: [254, 4, 198],
    align: 'right',
  });

  const drawSoloBlock = (numLabel: string, topY: number) => {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(624, topY + 28, 44, 22, 'B');
    page.text(numLabel, 624, topY + 18, {
      font: 'F2',
      size: 6.5,
      color: [254, 4, 198],
      align: 'center',
    });

    // One-way arrow pointing to Core 6 target box
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.1);
    page.line(670, topY + 28, 720, topY + 28);
    page.text('►', 717, topY + 31, { font: 'F2', size: 8, color: [15, 23, 42] });
    page.text('One-Way Tie', 694, topY + 21, {
      font: 'F1',
      size: 6.5,
      color: [100, 116, 139],
      align: 'center',
    });

    page.setStrokeColor(100, 116, 139);
    page.rect(726, topY + 12, 82, 32, 'S');
    page.text('CORE TARGET #', 767, topY + 23, {
      font: 'F2',
      size: 6.5,
      color: [100, 116, 139],
      align: 'center',
    });

    const lines = [
      `${numLabel} Role Title & Gender (F/M/Adapt):`,
      'One-Sided Secret / Why They Are Here:',
      'Clue / Interrogation Prompt:',
    ];
    let sy = topY + 66;
    for (const l of lines) {
      page.text(l, 574, sy, { font: 'F2', size: 7.2, color: [71, 85, 105] });
      page.setStrokeColor(203, 213, 225);
      page.setLineWidth(0.5);
      page.setDash([2, 2]);
      page.line(574, sy + 14, 808, sy + 14);
      page.line(574, sy + 28, 808, sy + 28);
      page.setDash([]);
      sy += 46;
    }
  };

  drawSoloBlock('#12 SOLO A', 138);
  page.setStrokeColor(226, 232, 240);
  page.setLineWidth(1);
  page.line(572, 348, 810, 348);
  drawSoloBlock('#13 SOLO B', 356);

  return page;
}

/**
 * PAGE 4 (For Grand 11–16p):
 * Extension Group E (Trio B: #14, #15, #16) + Extra Notes & Combination Matrix
 */
function buildPage4GrandExtensionGroup(
  opts: BrainstormWorksheetOptions,
  totalPages: number
): PdfPageCanvas {
  const page = new PdfPageCanvas();

  drawWorksheetHeader(
    page,
    opts,
    'Grand Extension Group (#14–#16 Trio B) & Extra Clues',
    `Completes the 16-player Grand Roster. Trio B (#14, #15, #16) unlocks for 12–16 player parties.`,
    4,
    totalPages
  );

  // Left Half: Trio B (#14, #15, #16) Triangle Web
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(24, 108, 385, 462, 'S');
  page.setFillColor(15, 23, 42);
  page.rect(24, 108, 385, 22, 'f');
  page.text('GROUP D: TRIO B (#14, #15 & #16)', 34, 122, {
    font: 'F2',
    size: 8.5,
    color: [255, 255, 255],
  });
  page.text('+3 PLAYERS (12p–16p GRAND)', 400, 122, {
    font: 'F2',
    size: 7,
    color: [254, 4, 198],
    align: 'right',
  });

  const trioBNodes = [
    { label: '#14 SUSPECT', cx: 216, cy: 175 },
    { label: '#15 SUSPECT', cx: 120, cy: 265 },
    { label: '#16 SUSPECT', cx: 312, cy: 265 },
  ];
  page.setStrokeColor(203, 213, 225);
  page.setDash([3, 3]);
  page.line(185, 195, 145, 240);
  page.line(247, 195, 287, 240);
  page.line(174, 265, 258, 265);
  page.setDash([]);

  for (const tn of trioBNodes) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(tn.cx, tn.cy, 52, 24, 'B');
    page.text(tn.label, tn.cx, tn.cy - 10, {
      font: 'F2',
      size: 7,
      color: [100, 116, 139],
      align: 'center',
    });
  }

  const trioBPrompts = [
    '#14 Role Title, Gender & Vibe:',
    '#15 Role Title, Gender & Vibe:',
    '#16 Role Title, Gender & Vibe:',
    'Their 3-Way Drama & One-Sided Core 6 Hook:',
    'Round 4 & Round 5 Clues for Trio B:',
  ];
  let by = 315;
  for (const label of trioBPrompts) {
    page.text(label, 36, by, { font: 'F2', size: 7.5, color: [71, 85, 105] });
    page.setStrokeColor(203, 213, 225);
    page.setLineWidth(0.5);
    page.setDash([2, 2]);
    page.line(36, by + 15, 396, by + 15);
    page.line(36, by + 30, 396, by + 30);
    page.setDash([]);
    by += 50;
  }

  // Right Half: Auto-Grouping Reference Chart (6–16 Players) + Free Sketch Area
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.8);
  page.rect(422, 108, 396, 462, 'S');
  page.setFillColor(241, 245, 249);
  page.rect(422.5, 108.5, 395, 22, 'f');
  page.text('HOW YOUR GROUPS AUTO-COMBINE (6–16 PLAYERS)', 432, 122, {
    font: 'F2',
    size: 8.5,
    color: [15, 23, 42],
  });

  const rows = [
    ['6 Players (Basic • 3R):', 'Core 6 (#1–#6)'],
    ['7 Players (Premium • 4R):', 'Core 6 + Solo A (#12)'],
    ['8 Players (Premium • 4R):', 'Core 6 + Pair (#7, #8)'],
    ['9 Players (Premium • 4R):', 'Core 6 + Trio A (#9, #10, #11)'],
    ['10 Players (Premium • 4R):', 'Core 6 + Trio A (#9–11) + Solo A (#12)'],
    ['11 Players (Grand • 5R):', 'Core 6 + Trio A (#9–11) + Pair (#7, #8)'],
    ['12 Players (Grand • 5R):', 'Core 6 + Trio A (#9–11) + Trio B (#14–16)'],
    ['13 Players (Grand • 5R):', 'Core 6 + Trio A + Trio B + Solo A (#12)'],
    ['14 Players (Grand • 5R):', 'Core 6 + Trio A + Trio B + Pair (#7, #8)'],
    ['15 Players (Grand • 5R):', 'Core 6 + Trio A + Trio B + Pair + Solo A'],
    ['16 Players (Grand • 5R):', 'All 16 Characters (#1–#16)'],
  ];

  let ry = 146;
  for (const [left, right] of rows) {
    page.text(left, 434, ry, { font: 'F2', size: 7.5, color: [15, 23, 42] });
    page.text(right, 565, ry, { font: 'F1', size: 7.5, color: [71, 85, 105] });
    ry += 16;
  }

  // Extra Notes / Sketch Box below table
  page.setStrokeColor(203, 213, 225);
  page.line(432, 330, 808, 330);
  page.text('EXTRA CLUE IDEAS / TWISTS / PROP NOTES:', 434, 346, {
    font: 'F2',
    size: 8,
    color: [15, 23, 42],
  });
  for (let l = 0; l < 11; l++) {
    const ly = 368 + l * 18;
    page.setStrokeColor(226, 232, 240);
    page.setDash([2, 2]);
    page.line(434, ly, 808, ly);
    page.setDash([]);
  }

  return page;
}

/**
 * LAST PAGE (Full-Page Master Character & Group Web taking the entire page space!):
 * - For Basic (6p): Full-page oversized Core 6 Web with maximum space to link & annotate all 6 characters.
 * - For Premium (7–10p): Full-page Master Web with Core 6 (#1–#6) in the center + clustered sub-webs for
 *   Pair (#7 & #8), Trio A (#9, #10 & #11), and Solo A (#12) arranged around the Core 6 so you can easily link
 *   within each group AND draw lines connecting them to the Core 6!
 * - For Grand (11–16p): Full-page Master Web with ALL 16 Characters (#1–#16) arranged by their groups:
 *   Center Core 6 (#1–#6) + Top-Left Pair (#7–#8) + Top-Right Trio A (#9–#11) + Bottom-Left Solos (#12 & #13) +
 *   Bottom-Right Trio B (#14–#16)!
 */
function buildLastPageFullMasterWeb(
  opts: BrainstormWorksheetOptions,
  pageNum: number,
  totalPages: number
): PdfPageCanvas {
  const page = new PdfPageCanvas();
  const cfg = BRAINSTORM_TIER_CONFIG[opts.tier];

  drawWorksheetHeader(
    page,
    opts,
    `Full-Page Master Character Web (${cfg.label})`,
    `All characters in this package arranged by group across the whole page. Link within each mini-group and draw lines into the Core 6.`,
    pageNum,
    totalPages
  );

  // Full-page outer frame (x: 24..818, y: 108..572 — 794pt x 464pt)
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.9);
  page.rect(24, 108, 794, 464, 'S');

  // Top strip inside canvas with inline Relationship Key reminder (y: 108..130)
  page.setFillColor(241, 245, 249);
  page.rect(24.5, 108.5, 793, 21, 'f');
  page.text(
    opts.tier === 'basic'
      ? 'FULL-PAGE MASTER WEB: ALL 6 CORE CHARACTERS'
      : opts.tier === 'premium'
      ? 'FULL-PAGE MASTER WEB: CORE 6 (CENTER) + PAIR (#7-8) + TRIO A (#9-11) + SOLO (#12)'
      : 'FULL-PAGE MASTER WEB: ALL 16 CHARACTERS GROUPED BY CLUSTER (CORE 6 + PAIR + TRIO A + SOLOS + TRIO B)',
    34,
    122,
    {
      font: 'F2',
      size: 7.5,
      color: [15, 23, 42],
    }
  );
  page.text(
    'KEY: o-o Siblings | o*o Married | z-z Work | +|+ Ex Bestie | ||-|| Exes | N-N Affair | O-O Friends | <-> Family | []-[] Besties | --> 1-Way Solo',
    810,
    122,
    {
      font: 'F1',
      size: 6.2,
      color: [71, 85, 105],
      align: 'right',
    }
  );

  if (opts.tier === 'basic') {
    // =======================================================================
    // BASIC PACKAGE: FULL-PAGE OVERSIZED 6-CHARACTER WEB
    // =======================================================================
    const cx = 421;
    const cy = 350;

    // Center #1 VICTIM (Oversized double oval)
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(2.0);
    page.ellipse(cx, cy, 76, 38, 'B');
    page.setLineWidth(0.7);
    page.ellipse(cx, cy, 71, 33, 'S');
    page.text('#1 VICTIM (CENTER)', cx, cy - 16, {
      font: 'F2',
      size: 8,
      color: [254, 4, 198],
      align: 'center',
    });
    if (opts.victimRole) {
      page.text(opts.victimRole, cx, cy + 4, {
        font: 'F2',
        size: 11,
        color: [15, 23, 42],
        align: 'center',
      });
    }

    const fullBasicNodes = [
      { label: '#2 SUSPECT (F / M)', cx: 215, cy: 205 },
      { label: '#3 SUSPECT (F / M)', cx: 627, cy: 205 },
      { label: '#4 SUSPECT (F / M)', cx: 680, cy: 385 },
      { label: '#5 SUSPECT (F / M)', cx: 421, cy: 500 },
      { label: '#6 SUSPECT (F / M)', cx: 162, cy: 385 },
    ];

    for (const n of fullBasicNodes) {
      page.setFillColor(255, 255, 255);
      page.setStrokeColor(15, 23, 42);
      page.setLineWidth(1.6);
      page.ellipse(n.cx, n.cy, 68, 32, 'B');
      page.text(n.label, n.cx, n.cy - 14, {
        font: 'F2',
        size: 7.5,
        color: [100, 116, 139],
        align: 'center',
      });
    }

    return page;
  }

  // =========================================================================
  // PREMIUM & GRAND PACKAGES:
  // Center Core 6 Cluster + Surrounding Extension Group Clusters on One Full Page!
  // =========================================================================

  // 1. CENTER CLUSTER: CORE 6 MAIN CAST (x: 264..578, y: 144..554)
  page.setStrokeColor(203, 213, 225);
  page.setLineWidth(0.9);
  page.setDash([5, 4]);
  page.rect(264, 144, 314, 410, 'S');
  page.setDash([]);

  page.setFillColor(15, 23, 42);
  page.rect(336, 136, 170, 16, 'f');
  page.text('CORE 6 MAIN CAST (#1 - #6)', 421, 147, {
    font: 'F2',
    size: 7.5,
    color: [255, 255, 255],
    align: 'center',
  });

  // Center #1 VICTIM inside Core 6
  const coreCx = 421;
  const coreCy = 348;
  page.setFillColor(255, 255, 255);
  page.setStrokeColor(15, 23, 42);
  page.setLineWidth(1.8);
  page.ellipse(coreCx, coreCy, 52, 26, 'B');
  page.setLineWidth(0.6);
  page.ellipse(coreCx, coreCy, 48, 22, 'S');
  page.text('#1 VICTIM', coreCx, coreCy - 10, {
    font: 'F2',
    size: 7,
    color: [254, 4, 198],
    align: 'center',
  });
  if (opts.victimRole) {
    page.text(opts.victimRole, coreCx, coreCy + 5, {
      font: 'F2',
      size: 8.5,
      color: [15, 23, 42],
      align: 'center',
    });
  }

  const coreSuspects = [
    { label: '#2 CORE', cx: 332, cy: 218 },
    { label: '#3 CORE', cx: 510, cy: 218 },
    { label: '#4 CORE', cx: 518, cy: 378 },
    { label: '#5 CORE', cx: 421, cy: 492 },
    { label: '#6 CORE', cx: 324, cy: 378 },
  ];

  for (const cs of coreSuspects) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(cs.cx, cs.cy, 44, 22, 'B');
    page.text(cs.label, cs.cx, cs.cy - 9, {
      font: 'F2',
      size: 6.5,
      color: [100, 116, 139],
      align: 'center',
    });
  }

  // 2. TOP-LEFT CLUSTER: GROUP A — THE PAIR (#7 & #8) (x: 34..242, y: 144..332)
  page.setStrokeColor(148, 163, 184);
  page.setLineWidth(0.8);
  page.setDash([4, 3]);
  page.rect(34, 144, 208, 188, 'S');
  page.setDash([]);

  page.setFillColor(254, 4, 198);
  page.rect(46, 136, 184, 16, 'f');
  page.text('GROUP A: THE PAIR (#7 & #8)', 138, 147, {
    font: 'F2',
    size: 7.2,
    color: [255, 255, 255],
    align: 'center',
  });

  // Pair ovals (#7 Top-Left, #8 Bottom-Right inside the Pair cluster so both are easy to link to each other AND Core 6)
  const p7 = { cx: 90, cy: 206 };
  const p8 = { cx: 184, cy: 274 };
  page.setStrokeColor(148, 163, 184);
  page.setDash([3, 3]);
  page.line(p7.cx + 25, p7.cy + 16, p8.cx - 25, p8.cy - 16);
  page.setDash([]);

  for (const [lbl, node] of [
    ['#7 PAIR', p7],
    ['#8 PAIR', p8],
  ] as const) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(node.cx, node.cy, 44, 22, 'B');
    page.text(lbl, node.cx, node.cy - 9, {
      font: 'F2',
      size: 6.5,
      color: [254, 4, 198],
      align: 'center',
    });
  }

  // 3. TOP-RIGHT CLUSTER: GROUP B — TRIO A (#9, #10 & #11) (x: 600..808, y: 144..338)
  page.setStrokeColor(148, 163, 184);
  page.setLineWidth(0.8);
  page.setDash([4, 3]);
  page.rect(600, 144, 208, 194, 'S');
  page.setDash([]);

  page.setFillColor(254, 4, 198);
  page.rect(612, 136, 184, 16, 'f');
  page.text('GROUP B: TRIO A (#9, #10 & #11)', 704, 147, {
    font: 'F2',
    size: 7.2,
    color: [255, 255, 255],
    align: 'center',
  });

  const t9 = { label: '#9 TRIO A', cx: 704, cy: 192 };
  const t10 = { label: '#10 TRIO A', cx: 652, cy: 286 };
  const t11 = { label: '#11 TRIO A', cx: 756, cy: 286 };
  page.setStrokeColor(148, 163, 184);
  page.setDash([3, 3]);
  page.line(t9.cx - 20, t9.cy + 18, t10.cx + 12, t10.cy - 18);
  page.line(t9.cx + 20, t9.cy + 18, t11.cx - 12, t11.cy - 18);
  page.line(t10.cx + 42, t10.cy, t11.cx - 42, t11.cy);
  page.setDash([]);

  for (const tn of [t9, t10, t11]) {
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(tn.cx, tn.cy, 42, 20, 'B');
    page.text(tn.label, tn.cx, tn.cy - 8, {
      font: 'F2',
      size: 6.2,
      color: [254, 4, 198],
      align: 'center',
    });
  }

  // 4. BOTTOM-LEFT CLUSTER: GROUP C — SOLO WILDCARDS (#12 & #13) (x: 34..242, y: 356..554)
  page.setStrokeColor(148, 163, 184);
  page.setLineWidth(0.8);
  page.setDash([4, 3]);
  page.rect(34, 356, 208, 198, 'S');
  page.setDash([]);

  page.setFillColor(15, 23, 42);
  page.rect(46, 348, 184, 16, 'f');
  page.text(
    opts.tier === 'premium'
      ? 'GROUP C: SOLO A (#12 | 1-WAY)'
      : 'GROUP C: SOLOS (#12 & #13 | 1-WAY)',
    138,
    359,
    {
      font: 'F2',
      size: 7,
      color: [255, 255, 255],
      align: 'center',
    }
  );

  // #12 Solo A Oval
  const s12Cy = opts.tier === 'premium' ? 435 : 412;
  page.setFillColor(255, 255, 255);
  page.setStrokeColor(15, 23, 42);
  page.setLineWidth(1.4);
  page.ellipse(116, s12Cy, 46, 22, 'B');
  page.text('#12 SOLO A', 116, s12Cy - 9, {
    font: 'F2',
    size: 6.5,
    color: [254, 4, 198],
    align: 'center',
  });
  page.text('1-Way -->', 202, s12Cy + 3, {
    font: 'F2',
    size: 7,
    color: [100, 116, 139],
    align: 'center',
  });

  if (opts.tier === 'grand') {
    // #13 Solo B Oval
    const s13Cy = 498;
    page.setFillColor(255, 255, 255);
    page.setStrokeColor(15, 23, 42);
    page.setLineWidth(1.4);
    page.ellipse(116, s13Cy, 46, 22, 'B');
    page.text('#13 SOLO B', 116, s13Cy - 9, {
      font: 'F2',
      size: 6.5,
      color: [254, 4, 198],
      align: 'center',
    });
    page.text('1-Way -->', 202, s13Cy + 3, {
      font: 'F2',
      size: 7,
      color: [100, 116, 139],
      align: 'center',
    });
  } else {
    page.text('Draw a one-way arrow from #12', 138, 492, {
      font: 'F1',
      size: 7,
      color: [100, 116, 139],
      align: 'center',
    });
    page.text('into any Core 6 character ---->', 138, 505, {
      font: 'F1',
      size: 7,
      color: [100, 116, 139],
      align: 'center',
    });
  }

  // 5. BOTTOM-RIGHT CLUSTER:
  // For Grand: GROUP D — TRIO B (#14, #15 & #16)
  // For Premium: Quick Auto-Combination Key + Extra Sketch Space
  page.setStrokeColor(148, 163, 184);
  page.setLineWidth(0.8);
  page.setDash([4, 3]);
  page.rect(600, 356, 208, 198, 'S');
  page.setDash([]);

  if (opts.tier === 'grand') {
    page.setFillColor(254, 4, 198);
    page.rect(612, 348, 184, 16, 'f');
    page.text('GROUP D: TRIO B (#14, #15 & #16)', 704, 359, {
      font: 'F2',
      size: 7.2,
      color: [255, 255, 255],
      align: 'center',
    });

    const t14 = { label: '#14 TRIO B', cx: 704, cy: 406 };
    const t15 = { label: '#15 TRIO B', cx: 652, cy: 500 };
    const t16 = { label: '#16 TRIO B', cx: 756, cy: 500 };
    page.setStrokeColor(148, 163, 184);
    page.setDash([3, 3]);
    page.line(t14.cx - 20, t14.cy + 18, t15.cx + 12, t15.cy - 18);
    page.line(t14.cx + 20, t14.cy + 18, t16.cx - 12, t16.cy - 18);
    page.line(t15.cx + 42, t15.cy, t16.cx - 42, t16.cy);
    page.setDash([]);

    for (const tn of [t14, t15, t16]) {
      page.setFillColor(255, 255, 255);
      page.setStrokeColor(15, 23, 42);
      page.setLineWidth(1.4);
      page.ellipse(tn.cx, tn.cy, 42, 20, 'B');
      page.text(tn.label, tn.cx, tn.cy - 8, {
        font: 'F2',
        size: 6.2,
        color: [254, 4, 198],
        align: 'center',
      });
    }
  } else {
    page.setFillColor(15, 23, 42);
    page.rect(612, 348, 184, 16, 'f');
    page.text('PREMIUM GROUP COMBINATIONS', 704, 359, {
      font: 'F2',
      size: 7,
      color: [255, 255, 255],
      align: 'center',
    });

    const premCombos = [
      '6 Players: Core 6 (#1-#6)',
      '7 Players: Core 6 + Solo A (#12)',
      '8 Players: Core 6 + Pair (#7 & #8)',
      '9 Players: Core 6 + Trio A (#9-#11)',
      '10 Players: Core 6 + Trio A + Solo A',
    ];
    let cy = 384;
    for (const line of premCombos) {
      page.text(line, 612, cy, { font: 'F2', size: 7.2, color: [51, 65, 85] });
      cy += 18;
    }
    page.text('WEB NOTES / CROSS-LINKS:', 612, 482, {
      font: 'F2',
      size: 7,
      color: [100, 116, 139],
    });
    page.setStrokeColor(203, 213, 225);
    page.setDash([2, 2]);
    page.line(612, 500, 796, 500);
    page.line(612, 520, 796, 520);
    page.line(612, 540, 796, 540);
    page.setDash([]);
  }

  return page;
}

/**
 * Compiles all pages into a valid binary PDF 1.4 Uint8Array.
 */
export function generateBrainstormWorksheetPdfBytes(
  options: BrainstormWorksheetOptions
): Uint8Array {
  const pages: PdfPageCanvas[] = [];
  const totalPages = options.tier === 'basic' ? 3 : options.tier === 'premium' ? 4 : 5;

  pages.push(buildPage1CoreWebAndBeats(options, totalPages));
  pages.push(buildPage2CoreCharacterCards(options, totalPages));
  if (options.tier === 'premium' || options.tier === 'grand') {
    pages.push(buildPage3ExtensionGroups1(options, totalPages));
  }
  if (options.tier === 'grand') {
    pages.push(buildPage4GrandExtensionGroup(options, totalPages));
  }
  pages.push(buildLastPageFullMasterWeb(options, totalPages, totalPages));

  // Object ID allocation:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // For each page i (0..N-1):
  //   pageObjId = 5 + i * 2
  //   contentObjId = 6 + i * 2
  const objects: Map<number, string> = new Map();
  const pageObjIds: number[] = [];

  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.set(
    4,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  pages.forEach((p, idx) => {
    const pageObjId = 5 + idx * 2;
    const contentObjId = 6 + idx * 2;
    pageObjIds.push(pageObjId);

    const stream = p.getStream();
    objects.set(
      contentObjId,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageObjId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
  });

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`
  );

  const maxObjId = 4 + pages.length * 2;
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let id = 1; id <= maxObjId; id++) {
    offsets[id] = pdf.length;
    const body = objects.get(id) || '';
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${maxObjId + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= maxObjId; id++) {
    const offStr = String(offsets[id]).padStart(10, '0');
    pdf += `${offStr} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}
