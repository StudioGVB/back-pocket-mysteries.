import { NextResponse } from 'next/server';
import sitemap from '@/app/sitemap';

const INDEXNOW_KEY = '8f4b2e9a1c7d3e6f5a0b8c9d2e1f4a3b';
const HOST = 'backpocketmysteries.com';

export async function GET() {
  return handleIndexNowPing();
}

export async function POST() {
  return handleIndexNowPing();
}

async function handleIndexNowPing() {
  try {
    const entries = await sitemap();
    const urlList = entries.map((e) => e.url);

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList,
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      submittedCount: urlList.length,
      urls: urlList,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to ping IndexNow',
      },
      { status: 500 }
    );
  }
}
