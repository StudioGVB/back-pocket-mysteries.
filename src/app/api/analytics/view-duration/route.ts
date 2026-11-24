import { NextRequest, NextResponse } from 'next/server';
import { recordPageViewDurationSample } from '@/lib/view-duration-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const durationSeconds = Number(body.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 1800) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const countryCode =
      req.headers.get('x-vercel-ip-country')?.trim() ||
      req.headers.get('cf-ipcountry')?.trim() ||
      null;

    await recordPageViewDurationSample({
      path: body.path,
      durationSeconds,
      countryCode,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
