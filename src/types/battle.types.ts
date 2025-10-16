import { BattleRoomStatus, DifficultyLevel, RawBattleRoomStatus } from './database.types';

function normalizeBattleRoomStatus(status: RawBattleRoomStatus): BattleRoomStatus {
  switch (status) {
    case 'in_progress':
      return 'playing';
    case 'completed':
      return 'finished';
    case 'cancelled':
      return 'abandoned';
    default:
      return status;
  }
}

// 対戦ルーム情報
export interface BattleRoomInfo {
  id: string;
  roomCode: string;
  difficulty: DifficultyLevel;
  hostUserId: string;
  guestUserId: string | null;
  hostSessionId: string;
  guestSessionId: string | null;
  status: BattleRoomStatus;
  currentQuestionIndex: number;
  questionIds: string[];
  hostScore: number;
  guestScore: number;
  createdAt: string;
  expiresAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// 対戦中の回答情報
export interface BattleAnswer {
  id: string;
  roomId: string;
  playerUserId: string;
  playerSessionId: string;
  questionIndex: number;
  questionId: string;
  isCorrect: boolean;
  answerTimeMs: number;
  answeredAt: string;
}

// プレイヤー情報
export interface PlayerInfo {
  userId: string;
  sessionId: string;
  isHost: boolean;
  score: number;
}

// 対戦エラーコード
export enum BattleErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_EXPIRED = 'ROOM_EXPIRED',
  ROOM_ALREADY_STARTED = 'ROOM_ALREADY_STARTED',
  INVALID_ROOM_CODE = 'INVALID_ROOM_CODE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 対戦エラー
export class BattleError extends Error {
  constructor(
    public code: BattleErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BattleError';
  }
}

// Realtime接続状態
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

// 対戦相手の状態
export interface OpponentStatus {
  userId: string | null;
  sessionId: string | null;
  connectionStatus: ConnectionStatus;
  hasAnswered: boolean;
}

// 対戦結果
export interface BattleResult {
  roomId: string;
  hostScore: number;
  guestScore: number;
  winner: 'host' | 'guest' | 'draw';
  totalQuestions: number;
  playerStats: {
    correctAnswers: number;
    averageAnswerTime: number;
    fastestAnswer: number;
  };
  opponentStats: {
    correctAnswers: number;
    averageAnswerTime: number;
    fastestAnswer: number;
  };
}

// ヘルパー関数: データベース型からアプリケーション型への変換
import type { Database } from './database.types';

type BattleRoomRow = Database['public']['Tables']['battle_rooms']['Row'];
type BattleAnswerRow = Database['public']['Tables']['battle_answers']['Row'];

export function mapToBattleRoomInfo(row: BattleRoomRow): BattleRoomInfo {
  return {
    id: row.id,
    roomCode: row.room_code,
    difficulty: row.difficulty,
    hostUserId: row.host_user_id,
    guestUserId: row.guest_user_id,
    hostSessionId: row.host_session_id,
    guestSessionId: row.guest_session_id,
    status: normalizeBattleRoomStatus(row.status),
    currentQuestionIndex: row.current_question_index,
    questionIds: Array.isArray(row.question_ids) ? row.question_ids : [],
    hostScore: row.host_score,
    guestScore: row.guest_score,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function mapToBattleAnswer(row: BattleAnswerRow): BattleAnswer {
  return {
    id: row.id,
    roomId: row.room_id,
    playerUserId: row.player_user_id,
    playerSessionId: row.player_session_id,
    questionIndex: row.question_index,
    questionId: row.question_id,
    isCorrect: row.is_correct,
    answerTimeMs: row.answer_time_ms,
    answeredAt: row.answered_at,
  };
}
