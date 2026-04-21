'use client';

import { useEffect, useRef, useState } from 'react';

// videoId  : 변경 즉시 오디오 다운로드 시작 (프리로드)
// shouldPlay: true 가 되는 순간 재생 (카운트다운 완료 후)
// → 두 값 분리로 "카운트 전에 미리 받고, 카운트 끝나면 즉시 재생" 구현

type Status = 'idle' | 'loading' | 'playing' | 'error' | 'suspended';

export function YoutubePlayer({
  videoId,
  shouldPlay,
}: {
  videoId: string | null;
  shouldPlay: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlayRef = useRef(shouldPlay);   // 클로저 없이 최신값 읽기용
  const canReadyRef = useRef(false);          // canplay 이미 발생했는지
  const [status, setStatus] = useState<Status>('idle');

  // 항상 최신 shouldPlay 값 유지
  shouldPlayRef.current = shouldPlay;

  function clearMediaSession() {
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    } catch {}
  }

  function stopCurrent() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
    canReadyRef.current = false;
  }

  function doPlay(audio: HTMLAudioElement) {
    audio.play()
      .then(() => { clearMediaSession(); setStatus('playing'); })
      .catch((err) => {
        if (err.name === 'NotAllowedError') setStatus('suspended');
        else { console.error('[YoutubePlayer] play() 실패:', err); setStatus('error'); }
      });
  }

  // ── videoId 변경 → 즉시 프리로드 시작 ──────────────────────────────
  useEffect(() => {
    if (!videoId) {
      stopCurrent();
      setStatus('idle');
      return;
    }

    stopCurrent();
    setStatus('loading');

    let aborted = false;
    const audio = new Audio(`/api/audio?videoId=${videoId}`);
    audio.preload = 'auto';
    try {
      (audio as HTMLAudioElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;
    } catch {}
    audioRef.current = audio;

    audio.addEventListener('canplay', () => {
      if (aborted) return;
      canReadyRef.current = true;
      if (shouldPlayRef.current) {
        // 카운트다운이 이미 끝났으면 즉시 재생
        doPlay(audio);
      }
      // 아직 카운트 중이면 shouldPlay 효과에서 처리
    });

    audio.addEventListener('playing', () => {
      if (aborted) return;
      clearMediaSession();
      setStatus('playing');
    });

    audio.addEventListener('ended', () => { if (!aborted) setStatus('idle'); });

    audio.addEventListener('error', () => {
      if (aborted) return;
      console.error('[YoutubePlayer] 오디오 에러 code:', audio.error?.code, audio.error?.message);
      setStatus('error');
    });

    return () => {
      aborted = true;
      stopCurrent();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // ── shouldPlay 변경 → 이미 로드된 오디오 재생/정지 ─────────────────
  useEffect(() => {
    if (!shouldPlay) {
      // 카운트다운 리셋(다음 문제) 시 재생 중이면 정지
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }
    // shouldPlay = true: 오디오가 이미 준비됐으면 즉시 재생
    if (canReadyRef.current && audioRef.current) {
      doPlay(audioRef.current);
    }
    // 아직 로딩 중이면 canplay 핸들러가 재생
  }, [shouldPlay]);

  const handleManualPlay = () => {
    if (audioRef.current) {
      doPlay(audioRef.current);
    }
  };

  return (
    <>
      {/* 카운트다운 완료 후에도 아직 로딩 중인 경우만 표시 */}
      {shouldPlay && status === 'loading' && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(0,0,0,0.75)', color: '#fff',
          borderRadius: 12, padding: '10px 24px', fontSize: 14,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          🎵 음악 로딩 중…
        </div>
      )}
      {(status === 'suspended' || status === 'error') && (
        <button onClick={handleManualPlay} style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#FF9900', color: 'white', border: 'none',
          borderRadius: 12, padding: '10px 24px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          🎵 음악 켜기
        </button>
      )}
    </>
  );
}
