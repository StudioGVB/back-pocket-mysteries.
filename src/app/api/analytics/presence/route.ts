import { NextRequest, NextResponse } from 'next/server';
import {
  recordVisitorPresenceHeartbeat,
  getLivePresenceSnapshot,
} from '@/lib/live-presence-store';

function normalizeReferrerSource(rawRef: string): string {
  const r = (rawRef || '').toLowerCase();
  if (!r) return 'Direct';
  if (r.includes('instagram.com') || r.includes('l.instagram.com')) return 'Instagram';
  if (r.includes('facebook.com') || r.includes('fb.com')) return 'Facebook';
  if (r.includes('linkedin.com') || r.includes('lnkd.in')) return 'LinkedIn';
  if (r.includes('tiktok.com')) return 'TikTok';
  if (r.includes('google.')) return 'Google Search';
  if (r.includes('bing.com')) return 'Bing Search';
  if (r.includes('chatgpt.com') || r.includes('openai.com')) return 'ChatGPT';
  if (r.includes('backpocketmysteries.com') || r.includes('localhost')) return 'Internal';
  try {
    return new URL(rawRef).hostname.replace(/^www\./, '');
  } catch {
    return 'Referral';
  }
}

export async function POST(req: NextRequest) {
  try {
    if (req.cookies.get('bpm_owner_exclude')?.value === '1') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.sessionId !== 'string' || typeof body.path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (/^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(body.path)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const countryCode =
      req.headers.get('x-vercel-ip-country')?.trim() ||
      req.headers.get('cf-ipcountry')?.trim() ||
      'GB';

    const rawCity = req.headers.get('x-vercel-ip-city')?.trim() || '';
    let city = '';
    try {
      city = rawCity ? decodeURIComponent(rawCity) : '';
    } catch {
      city = rawCity;
    }

    const rawLat = req.headers.get('x-vercel-ip-latitude');
    const rawLon = req.headers.get('x-vercel-ip-longitude');
    const lat = rawLat && !Number.isNaN(Number(rawLat)) ? Number(rawLat) : null;
    const lon = rawLon && !Number.isNaN(Number(rawLon)) ? Number(rawLon) : null;

    const device = ['mobile', 'tablet', 'desktop'].includes(body.device)
      ? body.device
      : 'desktop';

    const referrerSource = normalizeReferrerSource(body.referrer || '');

    await recordVisitorPresenceHeartbeat({
      sessionId: body.sessionId.slice(0, 64),
      path: body.path,
      countryCode,
      city,
      lat,
      lon,
      device,
      referrerSource,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { requireAdmin } = await import('@/utils/admin-auth');
    await requireAdmin();
    const snapshot = await getLivePresenceSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err: any) {
    const isAuthErr =
      err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden');
    return NextResponse.json(
      { ok: false, error: isAuthErr ? 'Forbidden' : 'Internal error' },
      { status: isAuthErr ? 403 : 500 }
    );
  }
}
