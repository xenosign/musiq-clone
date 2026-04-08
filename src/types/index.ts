export type Decade = '1980' | '1990' | '2000' | '2005' | '2010' | '2015' | '2021' | '2022' | '2023' | '2024' | '2025';

export const DECADES: Decade[] = ['1980', '1990', '2000', '2005', '2010', '2015', '2021', '2022', '2023', '2024', '2025'];

export const DECADE_LABELS: Record<Decade, string> = {
  '1980': '1980년대',
  '1990': '1990년대',
  '2000': '2000~2004',
  '2005': '2005~2009',
  '2010': '2010~2014',
  '2015': '2015~2019',
  '2021': '2021년',
  '2022': '2022년',
  '2023': '2023년',
  '2024': '2024년',
  '2025': '2025년',
};

export interface PlayerScore {
  name: string;
  score: number;
}

export interface Room {
  id: string;
  hostName: string;
  maxPlayers: number;
  totalQuestions: number;
  players: string[];
  scores: Record<string, number>;
  decades: Decade[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export interface RoomSummary {
  id: string;
  hostName: string;
  maxPlayers: number;
  playerCount: number;
  decades: Decade[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: number;
}

export interface QuizQuestion {
  questionNumber: number;
  totalQuestions: number;
  artist: string;
  title: string;
  year: number;
  decade: Decade;
  videoId: string | null;
}

export type ServerMessage =
  | { type: 'room_list'; payload: { rooms: RoomSummary[] } }
  | { type: 'room_created'; payload: { roomId: string; room: Room } }
  | { type: 'room_joined'; payload: { roomId: string; room: Room } }
  | { type: 'room_updated'; payload: { room: Room } }
  | { type: 'chat_message'; payload: ChatMessage }
  | { type: 'error'; payload: { message: string } }
  | { type: 'game_started'; payload: { totalQuestions: number } }
  | { type: 'next_question'; payload: QuizQuestion }
  | { type: 'answer_correct'; payload: { playerName: string; songTitle: string; scores: Record<string, number> } }
  | { type: 'game_finished'; payload: { scores: Record<string, number>; winner: string } };
