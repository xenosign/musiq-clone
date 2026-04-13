'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  Decade,
  DECADE_LABELS,
  DECADES,
  RoomSummary,
  ServerMessage,
} from '@/types';

type View = 'home' | 'create' | 'join';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('home');
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [selectedDecades, setSelectedDecades] = useState<Decade[]>(['2000']);
  const [hostOnlyMusic, setHostOnlyMusic] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const roomPasswordRef = useRef('');
  const [passwordModal, setPasswordModal] = useState<{ roomId: string } | null>(
    null,
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState('');

  const toggleDecade = (d: Decade) => {
    setSelectedDecades((prev) =>
      prev.includes(d)
        ? prev.length === 1
          ? prev
          : prev.filter((x) => x !== d)
        : [...prev, d],
    );
  };

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === 'room_list') {
        setRooms(msg.payload.rooms);
      } else if (msg.type === 'room_created') {
        const pw = roomPasswordRef.current;
        const url = `/room/${msg.payload.roomId}?name=${encodeURIComponent(playerName.trim())}${pw ? `&password=${encodeURIComponent(pw)}` : ''}`;
        router.push(url);
      } else if (msg.type === 'error') {
        setError(msg.payload.message);
      }
    },
    [router, playerName],
  );

  const { send } = useWebSocket(handleMessage);

  const handleCreate = () => {
    if (!playerName.trim()) return setError('닉네임을 입력해주세요.');
    setError('');
    send({
      type: 'create_room',
      payload: {
        maxPlayers,
        hostName: playerName.trim(),
        decades: selectedDecades,
        totalQuestions,
        hostOnlyMusic,
        isPrivate,
        password: isPrivate ? roomPassword : '',
      },
    });
  };

  const handleJoin = (roomId: string, password?: string) => {
    if (!playerName.trim()) return setError('닉네임을 입력해주세요.');
    setError('');
    const url = `/room/${roomId}?name=${encodeURIComponent(playerName.trim())}${password ? `&password=${encodeURIComponent(password)}` : ''}`;
    router.push(url);
  };

  const handleRoomClick = (room: RoomSummary) => {
    if (!playerName.trim()) return setError('닉네임을 입력해주세요.');
    if (room.isPrivate) {
      setPasswordInput('');
      setPasswordModal({ roomId: room.id });
    } else {
      handleJoin(room.id);
    }
  };

  const handleViewJoin = () => {
    send({ type: 'list_rooms' });
    setView('join');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-2" style={{ color: '#FF9900' }}>
        <span style={{ color: '#FF9900' }}>♪</span> Tetz's MusiQ
      </h1>
      <p className="text-gray-400 mb-10 text-sm">
        음악을 듣고 제목을 맞춰보세요!
      </p>

      {view === 'home' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setView('create')}
            className="bg-orange-600 hover:bg-orange-700 transition px-6 py-3 rounded-xl font-semibold text-lg"
          >
            방 만들기
          </button>
          <button
            onClick={handleViewJoin}
            className="bg-gray-700 hover:bg-gray-600 transition px-6 py-3 rounded-xl font-semibold text-lg"
          >
            방 참가하기
          </button>
        </div>
      )}

      {view === 'create' && (
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5">
          <h2 className="text-xl font-bold">방 만들기</h2>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">닉네임</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#FF9900]"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              한국 가요 년대
              <span className="ml-2 text-orange-400 text-xs">
                {selectedDecades.length}개 선택
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DECADES.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDecade(d)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    selectedDecades.includes(d)
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
            <label className="text-sm text-gray-400 mb-1 block">
              최대 인원: {maxPlayers}명
            </label>
            <input
              type="range"
              min={2}
              max={12}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-[#FF9900]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2명</span>
              <span>12명</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              문제 수: {totalQuestions}문제
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="w-full accent-[#FF9900]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5문제</span>
              <span>30문제</span>
            </div>
          </div>

          {/* 호스트만 음악 재생 토글 */}
          <button
            type="button"
            onClick={() => setHostOnlyMusic((v) => !v)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition ${
              hostOnlyMusic
                ? 'border-[#FF9900] bg-[#FF9900]/10 text-white'
                : 'border-gray-600 bg-gray-700 text-gray-300'
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-semibold">
                🎵 호스트만 음악 재생
              </span>
              <span className="text-xs text-gray-400">
                {hostOnlyMusic
                  ? '호스트만 음악을 들을 수 있습니다'
                  : '모든 참가자가 음악을 듣습니다'}
              </span>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${hostOnlyMusic ? 'bg-[#FF9900]' : 'bg-gray-500'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hostOnlyMusic ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
          </button>

          {/* 비밀방 토글 */}
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition ${
              isPrivate
                ? 'border-[#FF9900] bg-[#FF9900]/10 text-white'
                : 'border-gray-600 bg-gray-700 text-gray-300'
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-semibold">🔒 비밀방 설정</span>
              <span className="text-xs text-gray-400">
                {isPrivate
                  ? '비밀번호가 있는 방입니다'
                  : '누구나 입장할 수 있습니다'}
              </span>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${isPrivate ? 'bg-[#FF9900]' : 'bg-gray-500'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
          </button>

          {isPrivate && (
            <input
              type="text"
              value={roomPassword}
              onChange={(e) => {
                setRoomPassword(e.target.value);
                roomPasswordRef.current = e.target.value;
              }}
              placeholder="방 비밀번호 입력"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#FF9900]"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            className="bg-orange-600 hover:bg-orange-700 transition px-6 py-2 rounded-xl font-semibold"
          >
            방 생성
          </button>
          <button
            onClick={() => setView('home')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← 뒤로
          </button>
        </div>
      )}

      {view === 'join' && (
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">방 참가하기</h2>
            <button
              onClick={() => send({ type: 'list_rooms' })}
              className="text-white bg-orange-600 hover:bg-orange-700 transition px-2 py-1 rounded-lg font-bold"
              title="새로고침"
            >
              ↺
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">닉네임</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#FF9900]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                현재 열린 방이 없습니다.
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  disabled={
                    room.playerCount >= room.maxPlayers ||
                    room.status === 'playing'
                  }
                  className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition rounded-xl px-4 py-3"
                >
                  <div className="text-left">
                    <p className="font-semibold flex items-center gap-1.5">
                      {room.isPrivate && (
                        <span className="text-orange-400 text-sm">🔒</span>
                      )}
                      {room.hostName}의 방
                    </p>
                    <p className="text-xs text-gray-400">
                      #{room.id} ·{' '}
                      {(room.decades ?? [])
                        .map((d) => DECADE_LABELS[d])
                        .join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {room.playerCount}/{room.maxPlayers}명
                    </p>
                    <span
                      className={`text-xs ${room.status === 'waiting' ? 'text-green-400' : 'text-yellow-400'}`}
                    >
                      {room.status === 'waiting' ? '대기 중' : '게임 중'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setView('home')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← 뒤로
          </button>
        </div>
      )}
      {/* 비밀번호 모달 */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4">
            <h3 className="text-lg font-bold">🔒 비밀방</h3>
            <p className="text-sm text-gray-400">비밀번호를 입력해주세요.</p>
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleJoin(passwordModal.roomId, passwordInput);
                  setPasswordModal(null);
                }
              }}
              placeholder="비밀번호"
              autoFocus
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#FF9900]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPasswordModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 transition px-4 py-2 rounded-xl text-sm font-semibold"
              >
                취소
              </button>
              <button
                onClick={() => {
                  handleJoin(passwordModal.roomId, passwordInput);
                  setPasswordModal(null);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 transition px-4 py-2 rounded-xl text-sm font-semibold"
              >
                입장
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
