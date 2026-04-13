'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  ChatMessage,
  Decade,
  DECADE_LABELS,
  DECADES,
  QuizQuestion,
  Room,
  ServerMessage,
} from '@/types';
import { YoutubePlayer } from '@/components/YoutubePlayer';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.id as string;
  const playerName = searchParams.get('name') ?? '';

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<{
    playerName: string;
    songTitle: string;
  } | null>(null);
  const [gameFinished, setGameFinished] = useState<{
    scores: Record<string, number>;
    winner: string;
  } | null>(null);
  const [showArtist, setShowArtist] = useState(false);
  const [showRestartConfig, setShowRestartConfig] = useState(false);
  const [restartDecades, setRestartDecades] = useState<Decade[]>(['2000']);
  const [restartTotalQuestions, setRestartTotalQuestions] = useState(10);
  const [countdown, setCountdown] = useState<number | null>(null);
  const pendingVideoIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 첫 상호작용 시 AudioContext unlock (모바일 자동재생 정책 대응)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
      }
      audioCtxRef.current.resume().catch(() => {});
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  const playBeep = (count: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // 3→낮은음, 2→중간음, 1→높은음
      osc.frequency.value = count === 3 ? 440 : count === 2 ? 550 : 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // 카운트다운 처리
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // AudioContext가 오디오 세션을 점령하지 않도록 suspend
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend().catch(() => {});
      }
      setVideoId(pendingVideoIdRef.current);
      setCountdown(null);
      return;
    }
    playBeep(countdown);
    const timer = setTimeout(
      () => setCountdown((c) => (c !== null ? c - 1 : null)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // 새 문제마다 가수 힌트를 13초 후에 표시 (카운트다운 3초 + 음악 기준 10초)
  useEffect(() => {
    if (!question) return;
    setShowArtist(false);
    const timer = setTimeout(() => setShowArtist(true), 13000);
    return () => clearTimeout(timer);
  }, [question]);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === 'room_joined') {
        setRoom(msg.payload.room);
      } else if (msg.type === 'room_updated') {
        setRoom(msg.payload.room);
      } else if (msg.type === 'chat_message') {
        setMessages((prev) => [...prev, msg.payload]);
      } else if (msg.type === 'game_started') {
        setGameFinished(null);
        setLastCorrect(null);
        setQuestion(null);
        setVideoId(null);
      } else if (msg.type === 'next_question') {
        setQuestion(msg.payload);
        setLastCorrect(null);
        setVideoId(null);
        pendingVideoIdRef.current = msg.payload.videoId;
        setCountdown(3);
      } else if (msg.type === 'answer_correct') {
        setLastCorrect({
          playerName: msg.payload.playerName,
          songTitle: msg.payload.songTitle,
        });
        setRoom((prev) =>
          prev ? { ...prev, scores: msg.payload.scores } : prev,
        );
      } else if (msg.type === 'game_finished') {
        setGameFinished(msg.payload);
        setQuestion(null);
        setVideoId(null);
      } else if (msg.type === 'error') {
        alert(msg.payload.message);
        router.push('/');
      }
    },
    [router],
  );

  const handleOpen = useCallback(() => {
    if (!playerName) {
      router.push('/');
      return;
    }
    sendRef.current({ type: 'join_room', payload: { roomId, playerName } });
  }, [roomId, playerName, router]);

  const { send } = useWebSocket(handleMessage, handleOpen);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = () => {
    const text = input.trim();
    if (!text) return;
    send({ type: 'chat_message', payload: { message: text } });
    setInput('');
  };

  const handleLeave = () => {
    send({ type: 'leave_room' });
    router.push('/');
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const isHost = room?.hostName === playerName;
  const scores = room
    ? [...room.players].sort(
        (a, b) => (room.scores?.[b] ?? 0) - (room.scores?.[a] ?? 0),
      )
    : [];

  return (
    <div className='h-screen bg-gray-950 text-white flex flex-col overflow-hidden'>
      {/* YoutubePlayer — hostOnlyMusic이면 호스트만, 아니면 전체 재생 */}
      {(!room?.hostOnlyMusic || isHost) && <YoutubePlayer videoId={videoId} />}
      {/* 카운트다운 오버레이 */}
      {countdown !== null && countdown > 0 && (
        <div className='fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40'>
          <div
            key={countdown}
            className='text-[14rem] font-black text-white select-none'
            style={{
              textShadow:
                '0 0 60px rgba(168,85,247,1), 0 0 120px rgba(168,85,247,0.6)',
              animation: 'countdown-pop 0.9s ease-out forwards',
            }}
          >
            {countdown}
          </div>
        </div>
      )}
      {/* Header */}
      <header className='bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0'>
        <div className='flex items-center gap-3'>
          <h1 className='font-bold' style={{ color: '#FF9900' }}>
            <span style={{ color: '#FF9900' }}>♪</span> Tetz's MusicQ
          </h1>
          {room && (
            <span className='bg-[#3d2200] text-orange-300 text-xs px-2 py-0.5 rounded-full'>
              {(room.decades ?? []).map((d) => DECADE_LABELS[d]).join(' · ')}
            </span>
          )}
          <span className='text-xs text-gray-500'>#{roomId}</span>
        </div>
        <button
          onClick={handleLeave}
          className='text-sm text-gray-400 hover:text-red-400 transition'
        >
          나가기
        </button>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-col flex-1 overflow-hidden min-w-0'>
          {/* Quiz Panel */}
          <div className='bg-gray-900 border-b border-gray-800 shrink-0'>
            {/* 대기 중 */}
            {room?.status === 'waiting' && (
              <div className='flex flex-col items-center gap-3 py-6 px-4'>
                <div className='text-4xl text-orange-500'>♪</div>
                <p className='text-gray-400 text-xl'>
                  {room.players.length}/{room.maxPlayers}명 참가 중
                </p>
                <p className='text-gray-500 text-sm'>
                  선택 년대:{' '}
                  <span className='text-orange-400 text-sm'>
                    {(room.decades ?? [])
                      .map((d) => DECADE_LABELS[d])
                      .join(', ')}
                  </span>
                </p>
                {room.totalQuestions && (
                  <p className='text-gray-500 text-sm'>
                    문제 수:{' '}
                    <span className='text-orange-400 text-sm'>
                      {room.totalQuestions}문제
                    </span>
                  </p>
                )}
                {isHost ? (
                  <button
                    onClick={() => send({ type: 'start_game' })}
                    disabled={room.players.length < 2}
                    className='mt-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition px-8 py-2 rounded-xl font-semibold text-sm'
                  >
                    {room.players.length < 2
                      ? '게임 시작 (2명 이상 필요)'
                      : '게임 시작'}
                  </button>
                ) : (
                  <p className='text-xs text-gray-500'>
                    호스트가 게임을 시작하면 시작됩니다
                  </p>
                )}
              </div>
            )}

            {/* 게임 진행 중 */}
            {room?.status === 'playing' && question && (
              <div className='p-4 flex flex-col gap-3'>
                <div className='flex items-center justify-between text-base text-gray-400'>
                  <span>
                    문제 {question.questionNumber} / {question.totalQuestions}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-500'>
                      {DECADE_LABELS[question.decade]}
                    </span>
                    {isHost && !lastCorrect && (
                      <button
                        onClick={() => send({ type: 'skip_question' })}
                        className='bg-gray-700 hover:bg-gray-600 transition px-3 py-1 rounded-lg text-xs font-medium'
                      >
                        ⏭ 스킵
                      </button>
                    )}
                  </div>
                </div>

                <div className='flex gap-4'>
                  {/* 힌트 / 정답 메시지 */}
                  <div className='flex-1'>
                    {!lastCorrect && (
                      <div className='bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2'>
                        <p className='text-sm text-gray-400 uppercase tracking-widest'>
                          이 노래의 제목은?
                        </p>
                        <div className='flex gap-6 mt-1'>
                          <div className='text-center'>
                            <p className='text-gray-500 text-sm mb-0.5'>가수</p>
                            {showArtist ? (
                              <p className='font-bold text-white text-2xl'>
                                {question.artist}
                              </p>
                            ) : (
                              <p className='font-bold text-gray-600 text-2xl'>
                                10초 후 공개...
                              </p>
                            )}
                          </div>
                          <div className='w-px bg-gray-700' />
                          <div className='text-center'>
                            <p className='text-gray-500 text-sm mb-0.5'>발매</p>
                            <p className='font-bold text-white text-2xl'>
                              {question.year}년
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {lastCorrect && (
                      <div className='bg-orange-600/10 border border-[#FF9900] rounded-xl p-4 flex flex-col items-center gap-1'>
                        <div className='text-4xl'>🎉</div>
                        <p className='text-orange-400 font-bold text-xl'>
                          {lastCorrect.playerName}님이 맞추셨습니다!
                        </p>
                        <p className='text-gray-300 text-base'>
                          정답:{' '}
                          <span className='text-white font-semibold'>
                            "{lastCorrect.songTitle}"
                          </span>
                        </p>
                        <p className='text-gray-500 text-sm mt-1'>
                          다음 문제 준비 중...
                        </p>
                      </div>
                    )}
                  </div>
                  {/* 데스크탑: 재생 상태 표시 UI */}
                  <div className='hidden md:flex w-56 shrink-0 bg-gray-800 rounded-xl items-center justify-center'>
                    <div className='text-center text-gray-500'>
                      <div
                        className={`text-2xl mb-1 text-orange-500 ${videoId ? 'animate-pulse' : ''}`}
                      >
                        ♪
                      </div>
                      <p className='text-xs'>
                        {videoId ? '재생 중...' : '로딩 중...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 게임 종료 */}
            {(room?.status === 'finished' || gameFinished) && gameFinished && (
              <div className='p-4 flex flex-col items-center gap-3'>
                <div className='text-3xl'>🏆</div>
                <p className='text-yellow-400 font-bold text-lg'>게임 종료!</p>
                <p className='text-gray-300 text-sm'>
                  우승:{' '}
                  <span className='text-white font-bold'>
                    {gameFinished.winner}
                  </span>
                </p>
                <div className='flex gap-2 flex-wrap justify-center mt-1'>
                  {Object.entries(gameFinished.scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, score], i) => (
                      <div
                        key={name}
                        className='bg-gray-800 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2'
                      >
                        <span className='text-gray-400'>{i + 1}.</span>
                        <span
                          className={
                            name === playerName
                              ? 'text-orange-400 font-bold'
                              : ''
                          }
                        >
                          {name}
                        </span>
                        <span className='text-yellow-400 font-bold'>
                          {score}점
                        </span>
                      </div>
                    ))}
                </div>
                {isHost && !showRestartConfig && (
                  <button
                    onClick={() => {
                      setRestartDecades(room?.decades ?? ['2000']);
                      setRestartTotalQuestions(room?.totalQuestions ?? 10);
                      setShowRestartConfig(true);
                    }}
                    className='mt-2 bg-orange-600 hover:bg-orange-700 transition px-6 py-2 rounded-xl text-sm font-semibold'
                  >
                    다시 시작
                  </button>
                )}
                {isHost && showRestartConfig && (
                  <div className='mt-3 bg-gray-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4'>
                    <h3 className='text-base font-bold text-white'>
                      다시 시작 설정
                    </h3>
                    <div>
                      <label className='text-sm text-gray-400 mb-2 block'>
                        년대 선택
                        <span className='ml-2 text-orange-400 text-xs'>
                          {restartDecades.length}개
                        </span>
                      </label>
                      <div className='grid grid-cols-3 gap-2'>
                        {DECADES.map((d) => (
                          <button
                            key={d}
                            onClick={() =>
                              setRestartDecades((prev) =>
                                prev.includes(d)
                                  ? prev.length === 1
                                    ? prev
                                    : prev.filter((x) => x !== d)
                                  : [...prev, d],
                              )
                            }
                            className={`py-1.5 rounded-lg text-xs font-medium transition ${
                              restartDecades.includes(d)
                                ? 'bg-orange-600 text-white ring-2 ring-[#FFB733]'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {DECADE_LABELS[d]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400 mb-1 block'>
                        문제 수: {restartTotalQuestions}문제
                      </label>
                      <input
                        type='range'
                        min={5}
                        max={30}
                        step={5}
                        value={restartTotalQuestions}
                        onChange={(e) =>
                          setRestartTotalQuestions(Number(e.target.value))
                        }
                        className='w-full accent-[#FF9900]'
                      />
                      <div className='flex justify-between text-xs text-gray-500 mt-1'>
                        <span>5문제</span>
                        <span>30문제</span>
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setShowRestartConfig(false)}
                        className='flex-1 bg-gray-700 hover:bg-gray-600 transition px-4 py-2 rounded-xl text-sm font-semibold'
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          send({
                            type: 'start_game',
                            payload: {
                              decades: restartDecades,
                              totalQuestions: restartTotalQuestions,
                            },
                          });
                          setShowRestartConfig(false);
                        }}
                        className='flex-1 bg-orange-600 hover:bg-orange-700 transition px-4 py-2 rounded-xl text-sm font-semibold'
                      >
                        시작!
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 점수판 + 채팅 영역 */}
          <div className='flex flex-1 overflow-hidden'>
            {/* 점수판 사이드바 (데스크탑만) */}
            <div className='hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-3 shrink-0 overflow-y-auto'>
              <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                점수
              </h2>
              <ul className='flex flex-col gap-2'>
                {scores.map((name, i) => (
                  <li
                    key={name}
                    className='flex flex-col gap-0.5 bg-gray-800 rounded-lg px-2.5 py-2'
                  >
                    <div className='flex items-center gap-1'>
                      <span className='text-base text-gray-500 shrink-0'>
                        {i + 1}.
                      </span>
                      <span
                        className={`text-base font-medium truncate ${name === playerName ? 'text-orange-400' : ''}`}
                      >
                        {name}
                        {name === room?.hostName && ' 👑'}
                      </span>
                    </div>
                    <span className='text-base text-yellow-400 font-bold pl-5'>
                      {room?.scores?.[name] ?? 0}점
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 채팅 영역 */}
            <div className='flex flex-col flex-1 overflow-hidden'>
              {/* 모바일: 참가자 가로 배치 */}
              <div className='flex md:hidden gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0 overflow-x-auto'>
                <span className='text-xs text-gray-500 shrink-0 self-center'>
                  참가자
                </span>
                {(room?.players ?? []).map((name) => (
                  <div
                    key={name}
                    className='flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1 shrink-0'
                  >
                    <span className='w-1.5 h-1.5 rounded-full bg-green-400 shrink-0' />
                    <span
                      className={`text-sm whitespace-nowrap ${name === playerName ? 'text-orange-400 font-semibold' : ''}`}
                    >
                      {name}
                      {name === room?.hostName && ' 👑'}
                    </span>
                  </div>
                ))}
              </div>

              {/* 모바일: 점수 가로 배치 (순위순) */}
              <div className='flex md:hidden gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0 overflow-x-auto'>
                <span className='text-xs text-gray-500 shrink-0 self-center'>
                  점수
                </span>
                {scores.map((name, i) => (
                  <div
                    key={name}
                    className='flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1 shrink-0'
                  >
                    <span className='text-xs text-gray-500'>{i + 1}.</span>
                    <span
                      className={`text-sm whitespace-nowrap ${name === playerName ? 'text-orange-400 font-semibold' : ''}`}
                    >
                      {name}
                      {name === room?.hostName && ' 👑'}
                    </span>
                    <span className='text-sm text-yellow-400 font-bold'>
                      {room?.scores?.[name] ?? 0}점
                    </span>
                  </div>
                ))}
              </div>

              {/* 채팅 메시지 */}
              <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-2'>
                {messages.map((msg, i) => {
                  const isSystem = msg.sender === 'System';
                  const isMe = msg.sender === playerName;
                  return (
                    <div
                      key={i}
                      className={`flex ${isSystem ? 'justify-center' : isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {isSystem ? (
                        <span className='text-sm text-gray-500 bg-gray-800 px-3 py-1 rounded-full'>
                          {msg.message}
                        </span>
                      ) : (
                        <div
                          className={`max-w-xs flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          {!isMe && (
                            <span className='text-xs text-gray-400 mb-1 ml-1'>
                              {msg.sender}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-orange-600 rounded-br-sm font-bold' : 'bg-gray-700 rounded-bl-sm'}`}
                          >
                            {msg.message}
                          </div>
                          <span className='text-xs text-gray-600 mt-1 mx-1'>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* 채팅 입력 */}
              <div className='border-t border-gray-800 p-3 flex gap-2 shrink-0'>
                <input
                  type='text'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    sendChat()
                  }
                  placeholder={
                    room?.status === 'playing'
                      ? '정답 또는 채팅 입력...'
                      : '채팅 입력...'
                  }
                  className='flex-1 bg-gray-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF9900]'
                />
                <button
                  onClick={sendChat}
                  className='bg-orange-600 hover:bg-orange-700 transition px-4 py-2 rounded-xl text-sm font-semibold'
                >
                  전송
                </button>
              </div>
            </div>

            {/* 참가자 사이드바 (데스크탑만) */}
            <aside className='hidden md:flex flex-col w-64 bg-gray-900 border-l border-gray-800 p-4 shrink-0 overflow-y-auto'>
              <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                참가자 ({room?.players.length ?? 0}/{room?.maxPlayers ?? '?'})
              </h2>
              <ul className='flex flex-col gap-2'>
                {(room?.players ?? []).map((name) => (
                  <li key={name} className='flex items-center gap-2 text-sm'>
                    <span className='w-2 h-2 rounded-full bg-green-400 shrink-0' />
                    <span
                      className={
                        name === playerName
                          ? 'text-orange-400 font-semibold'
                          : ''
                      }
                    >
                      {name}
                      {name === room?.hostName && ' 👑'}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
