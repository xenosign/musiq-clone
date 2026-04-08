import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ videoId: null });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ videoId: null, error: 'YOUTUBE_API_KEY not set in .env.local' });
  }

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();
  console.log('YouTube API response:', JSON.stringify(data).slice(0, 500));
  const videoId: string | null = data.items?.[0]?.id?.videoId ?? null;
  return NextResponse.json({ videoId, debug: { status: res.status, itemCount: data.items?.length ?? 0, error: data.error?.message } });
}
