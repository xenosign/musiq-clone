'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement | string, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer { destroy(): void; stopVideo(): void }

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

  useEffect(() => {
    if (!videoId || !wrapperRef.current) return;

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
        playerVars: { autoplay: 1, rel: 0, controls: 0 },
      });
    };

    loadYTApi(init);

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  // 숨겨진 1px 플레이어 — 오디오만 재생
  return (
    <div
      ref={wrapperRef}
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
    />
  );
}
