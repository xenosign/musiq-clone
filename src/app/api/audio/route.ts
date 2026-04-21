import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// yt-dlp subprocess로 YouTube 오디오 스트림 URL을 추출합니다.
// HTML5 <video>/<audio> 엘리먼트를 사용하지 않으므로 OS SMTC에 곡 정보가 노출되지 않습니다.
//
// yt-dlp 설치 방법:
//   Windows: winget install yt-dlp  또는  pip install yt-dlp
//   확인:    yt-dlp --version

function getAudioUrlViaYtDlp(videoId: string): Promise<string | null> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('yt-dlp', [
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '--get-url',
      '--no-playlist',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const url = stdout.trim().split('\n')[0];
      if (code === 0 && url.startsWith('http')) {
        console.log(`[audio] yt-dlp ✓ url=${url.slice(0, 80)}…`);
        resolve(url);
      } else {
        console.error(`[audio] yt-dlp exit=${code} stderr=${stderr.slice(0, 300)}`);
        resolve(null);
      }
    });

    proc.on('error', (e) => {
      console.error('[audio] yt-dlp not found or failed:', e.message);
      console.error('[audio] Install: winget install yt-dlp  or  pip install yt-dlp');
      resolve(null);
    });

    // 30초 타임아웃
    setTimeout(() => { proc.kill(); resolve(null); }, 30_000);
  });
}

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });

  const audioUrl = await getAudioUrlViaYtDlp(videoId);
  if (!audioUrl) {
    return NextResponse.json(
      { error: 'yt-dlp로 오디오를 가져오지 못했습니다. yt-dlp가 설치되어 있는지 확인하세요.' },
      { status: 502 }
    );
  }

  // YouTube CDN에서 오디오를 가져와 클라이언트로 스트리밍 프록시
  let cdnRes: Response;
  try {
    cdnRes = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',  // 압축 없이 raw stream
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    console.error('[audio] CDN fetch error:', e);
    return NextResponse.json({ error: 'CDN fetch failed' }, { status: 502 });
  }

  if (!cdnRes.ok) {
    console.error(`[audio] CDN responded ${cdnRes.status}`);
    return NextResponse.json({ error: `CDN ${cdnRes.status}` }, { status: 502 });
  }

  console.log(`[audio] CDN ✓ status=${cdnRes.status} type=${cdnRes.headers.get('Content-Type')}`);

  const resHeaders: Record<string, string> = {
    'Content-Type': cdnRes.headers.get('Content-Type') ?? 'audio/webm',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  };
  const cl = cdnRes.headers.get('Content-Length');
  if (cl) resHeaders['Content-Length'] = cl;

  return new Response(cdnRes.body, { status: 200, headers: resHeaders });
}
