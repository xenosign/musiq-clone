import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { err } = await req.json();
    if (!err || typeof err !== 'string') {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }

    const url = process.env.VITE_SUPABASE_URL?.trim();
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !key) {
      console.error('[report] Supabase 환경변수 누락:', { url, hasKey: !!key });
      return NextResponse.json({ error: 'env missing' }, { status: 500 });
    }

    const res = await fetch(`${url}/rest/v1/music-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ err }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[report] Supabase 오류:', res.status, text);
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[report] 예외 발생:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
