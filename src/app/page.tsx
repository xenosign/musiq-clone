'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Decade, DECADE_LABELS, DECADES, RoomSummary, ServerMessage } from '@/types';

type View = 'home' | 'create' | 'join';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('home');
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [selectedDecades, setSelectedDecades] = useState<Decade[]>(['2000']);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState('');

  const toggleDecade = (d: Decade) => {
    setSelectedDecades((prev) =>
      prev.includes(d)
        ? prev.length === 1 ? prev : prev.filter((x) => x !== d) // 최소 1개 유지
        : [...prev, d]
    );
  };

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === 'room_list') {
        setRooms(msg.payload.rooms);
      } else if (msg.type === 'room_created') {
        router.push(`/room/${msg.payload.roomId}?name=${encodeURIComponent(playerName)}`);
      } else if (msg.type === 'error') {
        setError(msg.payload.message);
      }
    },
    [router, playerName]
  );

  const { send } = useWebSocket(handleMessage);

  const handleCreate = () => {
    if (!playerName.trim()) return setError('닉네임을 입력해주세요.');
    setError('');
    send({ type: 'create_room', payload: { maxPlayers, hostName: playerName.trim(), decades: selectedDecades } });
  };

  const handleJoin = (roomId: string) => {
    if (!playerName.trim()) return setError('닉네임을 입력해주세요.');
    setError('');
    router.push(`/room/${roomId}?name=${encodeURIComponent(playerName.trim())}`);
  };

  const handleViewJoin = () => {
    send({ type: 'list_rooms' });
    setView('join');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-2 text-purple-400">🎵 Music Quiz</h1>
      <p className="text-gray-400 mb-10 text-sm">음악을 듣고 제목을 맞춰보세요!</p>

      {view === 'home' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setView('create')}
            className="bg-purple-600 hover:bg-purple-700 transition px-6 py-3 rounded-xl font-semibold text-lg"
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
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              한국 가요 년대
              <span className="ml-2 text-purple-400 text-xs">{selectedDecades.length}개 선택</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DECADES.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDecade(d)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    selectedDecades.includes(d)
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {DECADE_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">최대 인원: {maxPlayers}명</label>
            <input
              type="range"
              min={2}
              max={8}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2명</span><span>8명</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            className="bg-purple-600 hover:bg-purple-700 transition px-6 py-2 rounded-xl font-semibold"
          >
            방 생성
          </button>
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-white text-sm">
            ← 뒤로
          </button>
        </div>
      )}

      {view === 'join' && (
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
          <h2 className="text-xl font-bold">방 참가하기</h2>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">닉네임</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">현재 열린 방이 없습니다.</p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleJoin(room.id)}
                  disabled={room.playerCount >= room.maxPlayers || room.status === 'playing'}
                  className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition rounded-xl px-4 py-3"
                >
                  <div className="text-left">
                    <p className="font-semibold">{room.hostName}의 방</p>
                    <p className="text-xs text-gray-400">
                      #{room.id} · {(room.decades ?? []).map((d) => DECADE_LABELS[d]).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{room.playerCount}/{room.maxPlayers}명</p>
                    <span className={`text-xs ${room.status === 'waiting' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {room.status === 'waiting' ? '대기 중' : '게임 중'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-white text-sm">
            ← 뒤로
          </button>
        </div>
      )}
    </main>
  );
}
