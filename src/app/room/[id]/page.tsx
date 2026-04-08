'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  ChatMessage,
  DECADE_LABELS,
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 문제마다 가수 힌트를 5초 후에 표시
  useEffect(() => {
    if (!question) return;
    setShowArtist(false);
    const timer = setTimeout(() => setShowArtist(true), 10000);
    return () => clearTimeout(timer);
  }, [question]);

  const fetchVideoId = useCallback(async (artist: string, title: string) => {
    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(`${artist} ${title} official audio`)}`,
      );
      const data = await res.json();
      setVideoId(data.videoId ?? null);
    } catch {
      setVideoId(null);
    }
  }, []);

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
        fetchVideoId(msg.payload.artist, msg.payload.title);
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
    [router, fetchVideoId],
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
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-purple-400">🎵 Music Quiz</h1>
          {room && (
            <span className="bg-purple-900 text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {(room.decades ?? []).map((d) => DECADE_LABELS[d]).join(' · ')}
            </span>
          )}
          <span className="text-xs text-gray-500">#{roomId}</span>
        </div>
        <button
          onClick={handleLeave}
          className="text-sm text-gray-400 hover:text-red-400 transition"
        >
          나가기
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Quiz Panel */}
          <div className="bg-gray-900 border-b border-gray-800 shrink-0">
            {/* 대기 중 */}
            {room?.status === 'waiting' && (
              <div className="flex flex-col items-center gap-3 py-6 px-4">
                <div className="text-4xl">🎵</div>
                <p className="text-gray-400 text-sm">
                  {room.players.length}/{room.maxPlayers}명 참가 중
                </p>
                <p className="text-gray-500 text-xs">
                  선택 년대:{' '}
                  <span className="text-purple-400">
                    {(room.decades ?? [])
                      .map((d) => DECADE_LABELS[d])
                      .join(', ')}
                  </span>
                </p>
                {room.totalQuestions && (
                  <p className="text-gray-500 text-xs">
                    문제 수:{' '}
                    <span className="text-purple-400">
                      {room.totalQuestions}문제
                    </span>
                  </p>
                )}
                {isHost ? (
                  <button
                    onClick={() => send({ type: 'start_game' })}
                    disabled={room.players.length < 2}
                    className="mt-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition px-8 py-2 rounded-xl font-semibold text-sm"
                  >
                    {room.players.length < 2
                      ? '게임 시작 (2명 이상 필요)'
                      : '게임 시작'}
                  </button>
                ) : (
                  <p className="text-xs text-gray-500">
                    호스트가 게임을 시작하면 시작됩니다
                  </p>
                )}
              </div>
            )}

            {/* 게임 진행 중 */}
            {room?.status === 'playing' && question && (
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    문제 {question.questionNumber} / {question.totalQuestions}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {DECADE_LABELS[question.decade]}
                    </span>
                    {isHost && !lastCorrect && (
                      <button
                        onClick={() => send({ type: 'skip_question' })}
                        className="bg-gray-700 hover:bg-gray-600 transition px-3 py-1 rounded-lg text-xs font-medium"
                      >
                        ⏭ 스킵
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  {/* 힌트 / 정답 메시지 */}
                  <div className="flex-1">
                    {!lastCorrect && (
                      <div className="bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2">
                        <p className="text-xs text-gray-400 uppercase tracking-widest">
                          이 노래의 제목은?
                        </p>
                        <div className="flex gap-6 mt-1">
                          <div className="text-center">
                            <p className="text-gray-500 text-xs mb-0.5">가수</p>
                            {showArtist ? (
                              <p className="font-bold text-white text-lg">
                                {question.artist}
                              </p>
                            ) : (
                              <p className="font-bold text-gray-600 text-lg">
                                5초 후 공개...
                              </p>
                            )}
                          </div>
                          <div className="w-px bg-gray-700" />
                          <div className="text-center">
                            <p className="text-gray-500 text-xs mb-0.5">발매</p>
                            <p className="font-bold text-white text-lg">
                              {question.year}년
                            </p>
                          </div>
                        </div>
                        {/* 테스트용 정답 표시 */}
                        {/* <p className="text-xs text-yellow-500 mt-2">[테스트] 정답: {question.title}</p> */}
                      </div>
                    )}
                    {lastCorrect && (
                      <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex flex-col items-center gap-1">
                        <div className="text-2xl">🎉</div>
                        <p className="text-green-400 font-bold">
                          {lastCorrect.playerName}님이 맞추셨습니다!
                        </p>
                        <p className="text-gray-300 text-sm">
                          정답:{' '}
                          <span className="text-white font-semibold">
                            "{lastCorrect.songTitle}"
                          </span>
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          다음 문제 준비 중...
                        </p>
                      </div>
                    )}
                  </div>
                  {/* YouTube 플레이어 — 방장만 재생 */}
                  {isHost && (
                    <div className="w-56 shrink-0">
                      {videoId ? (
                        <YoutubePlayer videoId={videoId} />
                      ) : (
                        <div className="h-full bg-gray-800 rounded-xl flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <div className="text-2xl mb-1 animate-pulse">
                              🎵
                            </div>
                            <p className="text-xs">로딩 중...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 게임 종료 */}
            {(room?.status === 'finished' || gameFinished) && gameFinished && (
              <div className="p-4 flex flex-col items-center gap-3">
                <div className="text-3xl">🏆</div>
                <p className="text-yellow-400 font-bold text-lg">게임 종료!</p>
                <p className="text-gray-300 text-sm">
                  우승:{' '}
                  <span className="text-white font-bold">
                    {gameFinished.winner}
                  </span>
                </p>
                <div className="flex gap-2 flex-wrap justify-center mt-1">
                  {Object.entries(gameFinished.scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, score], i) => (
                      <div
                        key={name}
                        className="bg-gray-800 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2"
                      >
                        <span className="text-gray-400">{i + 1}.</span>
                        <span
                          className={
                            name === playerName
                              ? 'text-purple-400 font-bold'
                              : ''
                          }
                        >
                          {name}
                        </span>
                        <span className="text-yellow-400 font-bold">
                          {score}점
                        </span>
                      </div>
                    ))}
                </div>
                {isHost && (
                  <button
                    onClick={() => send({ type: 'start_game' })}
                    className="mt-2 bg-purple-600 hover:bg-purple-700 transition px-6 py-2 rounded-xl text-sm font-semibold"
                  >
                    다시 시작
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 점수판 */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 shrink-0">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-500">점수:</span>
              {scores.map((name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-1 bg-gray-800 rounded-lg px-2.5 py-1"
                >
                  <span className="text-xs text-gray-500">{i + 1}.</span>
                  <span
                    className={`text-xs ${name === playerName ? 'text-purple-400 font-semibold' : ''}`}
                  >
                    {name}
                    {name === room?.hostName && ' 👑'}
                  </span>
                  <span className="text-xs text-yellow-400 ml-1">
                    {room?.scores?.[name] ?? 0}점
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 채팅 메시지 */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((msg, i) => {
              const isSystem = msg.sender === 'System';
              const isMe = msg.sender === playerName;
              return (
                <div
                  key={i}
                  className={`flex ${isSystem ? 'justify-center' : isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {isSystem ? (
                    <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                      {msg.message}
                    </span>
                  ) : (
                    <div
                      className={`max-w-xs flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {!isMe && (
                        <span className="text-xs text-gray-400 mb-1 ml-1">
                          {msg.sender}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-purple-600 rounded-br-sm' : 'bg-gray-700 rounded-bl-sm'}`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 mx-1">
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
          <div className="border-t border-gray-800 p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder={
                room?.status === 'playing'
                  ? '정답 또는 채팅 입력...'
                  : '채팅 입력...'
              }
              className="flex-1 bg-gray-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendChat}
              className="bg-purple-600 hover:bg-purple-700 transition px-4 py-2 rounded-xl text-sm font-semibold"
            >
              전송
            </button>
          </div>
        </div>

        {/* 사이드바 */}
        <aside className="w-44 bg-gray-900 border-l border-gray-800 p-4 flex flex-col shrink-0">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            참가자 ({room?.players.length ?? 0}/{room?.maxPlayers ?? '?'})
          </h2>
          <ul className="flex flex-col gap-2">
            {(room?.players ?? []).map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span
                  className={
                    name === playerName ? 'text-purple-400 font-semibold' : ''
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
  );
}
