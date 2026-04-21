'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement | string, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  destroy(): void;
  stopVideo(): void;
  playVideo(): void;
  unMute(): void;
  setVolume(vol: number): void;
}

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
        width: '320',
        height: '180',
        // mute:1 로 autoplay 정책 통과 후 즉시 unmute
        playerVars: { autoplay: 1, mute: 1, rel: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            try {
              event.target.playVideo();
              // 재생 시작되면 소리 복구
              setTimeout(() => {
                try {
                  event.target.unMute();
                  event.target.setVolume(100);
                } catch {}
              }, 300);
            } catch {}
            // 3초 후에도 재생 안 되면 버튼 표시
            timerRef.current = setTimeout(() => setNeedsInteraction(true), 3000);
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 1) { // PLAYING
              if (timerRef.current) clearTimeout(timerRef.current);
              setNeedsInteraction(false);
            } else if (event.data === 2) { // PAUSED — 예기치 않은 정지 시 자동 재개
              try { playerRef.current?.playVideo(); } catch {}
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
    try {
      playerRef.current?.playVideo();
      playerRef.current?.unMute();
      playerRef.current?.setVolume(100);
    } catch {}
    setNeedsInteraction(false);
  };

  return (
    <>
      {/* 뷰포트 내에 visibility:hidden으로 배치 — YouTube의 off-screen 감지 우회 */}
      <div
        ref={wrapperRef}
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '320px',
          height: '180px',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
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
            background: '#FF9900',
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
