import { NextRequest, NextResponse } from 'next/server';
import {
  BrainstormComplexity,
  BrainstormPackageTier,
  BrainstormSpiceLevel,
  generateBrainstormWorksheetPdfBytes,
} from '@/utils/brainstorm-pdf';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTier = (searchParams.get('tier') || 'basic').toLowerCase();
  const tier: BrainstormPackageTier =
    rawTier === 'premium' || rawTier === 'grand' ? rawTier : 'basic';

  const rawSpice = (searchParams.get('spice') || '').toLowerCase();
  const spiceLevel: BrainstormSpiceLevel =
    rawSpice === 'clean' || rawSpice === 'mild' || rawSpice === 'spicy' || rawSpice === 'filthy'
      ? rawSpice
      : '';

  const rawComplexity = (searchParams.get('complexity') || '').toLowerCase();
  const complexity: BrainstormComplexity =
    rawComplexity === 'easy' || rawComplexity === 'medium' || rawComplexity === 'hard'
      ? rawComplexity
      : '';

  const workingTitle = searchParams.get('title') || '';
  const theme = searchParams.get('theme') || '';
  const settingVibe = searchParams.get('vibe') || '';
  const victimRole = searchParams.get('victim') || '';
  const killerRole = searchParams.get('killer') || '';
  const murderMethod = searchParams.get('method') || '';
  const inline = searchParams.get('inline') === '1';

  const pdfBytes = generateBrainstormWorksheetPdfBytes({
    tier,
    workingTitle,
    theme,
    spiceLevel,
    complexity,
    settingVibe,
    victimRole,
    killerRole,
    murderMethod,
  });

  const slugTitle = workingTitle
    ? workingTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    : 'mystery';
  const rounds = tier === 'basic' ? 3 : tier === 'premium' ? 4 : 5;
  const filename = `${slugTitle}-brainstorm-${tier}-${rounds}rounds.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
