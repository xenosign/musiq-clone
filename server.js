const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { randomUUID } = require('crypto');
const { getSongsForDecades, shuffle } = require('./data/songs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const TOTAL_QUESTIONS = 10;
const QUESTION_TIMEOUT_MS = 30000;

// In-memory store
const rooms = new Map(); // roomId -> Room
const clients = new Map(); // ws -> ClientInfo

function broadcastToRoom(roomId, message, excludeWs = null) {
  for (const [ws, info] of clients.entries()) {
    if (info.roomId === roomId && ws !== excludeWs && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }
}

function sendAll(roomId, message) {
  broadcastToRoom(roomId, message);
}

function send(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function getRoomList() {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    hostName: r.hostName,
    maxPlayers: r.maxPlayers,
    playerCount: r.players.length,
    decades: r.decades,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

function normalize(str) {
  return str.toLowerCase().replace(/[\s''"`.,!?:()\-\[\]]/g, '');
}

function sendQuestion(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  if (game.currentIndex >= game.songs.length) {
    finishGame(roomId);
    return;
  }

  const song = game.songs[game.currentIndex];
  game.answered = false;
  game.answeredBy = null;

  sendAll(roomId, {
    type: 'next_question',
    payload: {
      questionNumber: game.currentIndex + 1,
      totalQuestions: game.songs.length,
      artist: song.artist,
      title: song.title,
      year: song.year,
      decade: song.decade,
    },
  });

  game.timer = setTimeout(() => {
    sendAll(roomId, {
      type: 'chat_message',
      payload: {
        sender: 'System',
        message: `⏰ 시간 초과! 정답은 "${song.title}" 이었습니다.`,
        timestamp: Date.now(),
      },
    });
    game.currentIndex++;
    setTimeout(() => sendQuestion(roomId), 2000);
  }, QUESTION_TIMEOUT_MS);
}

function finishGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.game?.timer) clearTimeout(room.game.timer);
  room.status = 'finished';
  room.game = null;

  const sorted = Object.entries(room.scores).sort(([, a], [, b]) => b - a);
  const winner = sorted[0]?.[0] ?? '없음';

  sendAll(roomId, { type: 'game_finished', payload: { scores: room.scores, winner } });
  sendAll(roomId, { type: 'room_updated', payload: { room } });
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.set(ws, { roomId: null, playerName: null });
    send(ws, { type: 'room_list', payload: { rooms: getRoomList() } });

    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }

      const clientInfo = clients.get(ws);

      switch (msg.type) {
        case 'list_rooms': {
          send(ws, { type: 'room_list', payload: { rooms: getRoomList() } });
          break;
        }

        case 'create_room': {
          const { maxPlayers, hostName, decades } = msg.payload;
          const roomId = randomUUID().slice(0, 8).toUpperCase();
          const room = {
            id: roomId,
            hostName,
            maxPlayers: Number(maxPlayers),
            players: [],
            scores: {},
            decades: Array.isArray(decades) && decades.length > 0 ? decades : ['2000'],
            status: 'waiting',
            createdAt: Date.now(),
            messages: [],
            game: null,
          };
          rooms.set(roomId, room);
          send(ws, { type: 'room_created', payload: { roomId, room } });
          break;
        }

        case 'join_room': {
          const { roomId, playerName } = msg.payload;
          const room = rooms.get(roomId);

          if (!room) { send(ws, { type: 'error', payload: { message: '존재하지 않는 방입니다.' } }); break; }
          if (!room.scores) room.scores = {};

          if (room.players.includes(playerName) && clientInfo.roomId !== roomId) {
            clientInfo.roomId = roomId;
            clientInfo.playerName = playerName;
            send(ws, { type: 'room_joined', payload: { roomId, room } });
            break;
          }

          if (room.players.length >= room.maxPlayers) { send(ws, { type: 'error', payload: { message: '방이 가득 찼습니다.' } }); break; }

          room.players.push(playerName);
          room.scores[playerName] = 0;
          clientInfo.roomId = roomId;
          clientInfo.playerName = playerName;

          send(ws, { type: 'room_joined', payload: { roomId, room } });
          broadcastToRoom(roomId, { type: 'room_updated', payload: { room } }, ws);
          broadcastToRoom(roomId, {
            type: 'chat_message',
            payload: { sender: 'System', message: `${playerName}님이 입장했습니다.`, timestamp: Date.now() },
          }, ws);
          break;
        }

        case 'start_game': {
          const { roomId, playerName } = clientInfo;
          if (!roomId) break;

          const room = rooms.get(roomId);
          if (!room || room.hostName !== playerName) break;
          if (room.players.length < 2) { send(ws, { type: 'error', payload: { message: '2명 이상이어야 시작할 수 있습니다.' } }); break; }

          // Reset scores
          room.scores = {};
          room.players.forEach((p) => { room.scores[p] = 0; });

          // Pick songs
          const allSongs = shuffle(getSongsForDecades(room.decades ?? ['2000']));
          const picked = allSongs.slice(0, Math.min(TOTAL_QUESTIONS, allSongs.length));

          room.status = 'playing';
          room.game = { songs: picked, currentIndex: 0, answered: false, answeredBy: null, timer: null };

          sendAll(roomId, { type: 'game_started', payload: { totalQuestions: picked.length } });
          sendAll(roomId, { type: 'room_updated', payload: { room } });

          setTimeout(() => sendQuestion(roomId), 1000);
          break;
        }

        case 'chat_message': {
          const { message } = msg.payload;
          const { roomId, playerName } = clientInfo;
          if (!roomId) break;

          const room = rooms.get(roomId);
          if (!room) break;

          // Check for correct answer
          if (room.status === 'playing' && room.game && !room.game.answered) {
            const song = room.game.songs[room.game.currentIndex];
            if (song && normalize(message) === normalize(song.title)) {
              room.game.answered = true;
              room.game.answeredBy = playerName;
              if (room.game.timer) clearTimeout(room.game.timer);

              room.scores[playerName] = (room.scores[playerName] ?? 0) + 1;

              // Broadcast the correct answer chat first
              const chatMsg = { sender: playerName, message, timestamp: Date.now() };
              sendAll(roomId, { type: 'chat_message', payload: chatMsg });

              // Then announce correct
              sendAll(roomId, {
                type: 'answer_correct',
                payload: { playerName, songTitle: song.title, scores: room.scores },
              });
              sendAll(roomId, { type: 'room_updated', payload: { room } });

              room.game.currentIndex++;
              setTimeout(() => sendQuestion(roomId), 3000);
              break;
            }
          }

          const chatMsg = { sender: playerName, message, timestamp: Date.now() };
          if (room.messages) room.messages.push(chatMsg);
          const payload = { type: 'chat_message', payload: chatMsg };
          send(ws, payload);
          broadcastToRoom(roomId, payload, ws);
          break;
        }

        case 'leave_room': {
          handleLeave(ws, clientInfo);
          break;
        }
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) handleLeave(ws, clientInfo);
      clients.delete(ws);
    });
  });

  function handleLeave(ws, clientInfo) {
    const { roomId, playerName } = clientInfo;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((p) => p !== playerName);
      if (room.players.length === 0) {
        if (room.game?.timer) clearTimeout(room.game.timer);
        rooms.delete(roomId);
      } else {
        broadcastToRoom(roomId, { type: 'room_updated', payload: { room } });
        broadcastToRoom(roomId, {
          type: 'chat_message',
          payload: { sender: 'System', message: `${playerName}님이 나갔습니다.`, timestamp: Date.now() },
        });
      }
    }
    clientInfo.roomId = null;
    clientInfo.playerName = null;
  }

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
