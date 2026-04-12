'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement | string, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer { destroy(): void; stopVideo(): void; playVideo(): void; }

let apiLoaded = false;
const readyCallbacks: (() => void)[] = [];

function loadYTApi(cb: () => void) {
  if (window.YT?.Player) { cb(); return; }
  readyCallbacks.push(cb);
  if (!apiLoaded) {
    apiLoaded = true;
    window.onYouTubeIframeAPIReady = () => {
      readyCallbacks.forEach((fn) => fn());
      readyCallbacks.length = 0;
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}

export function YoutubePlayer({ videoId }: { videoId: string | null }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    if (!videoId || !wrapperRef.current) return;

    setNeedsInteraction(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    const init = () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (!wrapperRef.current) return;

      wrapperRef.current.innerHTML = '';
      const el = document.createElement('div');
      wrapperRef.current.appendChild(el);

      playerRef.current = new window.YT.Player(el, {
        videoId,
        width: '1',
        height: '1',
        playerVars: { autoplay: 1, rel: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            try { event.target.playVideo(); } catch {}
            // 2초 후에도 재생 안 되면 버튼 표시
            timerRef.current = setTimeout(() => setNeedsInteraction(true), 2000);
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 1) { // PLAYING
              if (timerRef.current) clearTimeout(timerRef.current);
              setNeedsInteraction(false);
            }
          },
          onError: () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setNeedsInteraction(true);
          },
        },
      });
    };

    loadYTApi(init);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  const handlePlay = () => {
    try { playerRef.current?.playVideo(); } catch {}
    setNeedsInteraction(false);
  };

  return (
    <>
      {/* 숨겨진 1px 플레이어 — 오디오만 재생 */}
      <div
        ref={wrapperRef}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />
      {/* 자동재생 차단 시 재생 버튼 표시 */}
      {needsInteraction && (
        <button
          onClick={handlePlay}
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#ea580c',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          🎵 음악 켜기
        </button>
      )}
    </>
  );
}
