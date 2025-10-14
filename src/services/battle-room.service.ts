import { getSupabaseClient } from '../lib/supabase';
import type { DifficultyLevel } from '../types/database.types';
import {
  BattleError,
  BattleErrorCode,
  mapToBattleRoomInfo,
  type BattleRoomInfo,
} from '../types/battle.types';

const ROOM_CODE_LENGTH = 6;
const MAX_QUESTIONS_PER_BATTLE = 10;

/**
 * ルームコードを生成する
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 問題IDをランダムに取得する
 */
async function getRandomQuestionIds(
  difficulty: DifficultyLevel,
  count: number
): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('questions')
    .select('id')
    .eq('difficulty', difficulty)
    .limit(count * 2); // 余分に取得してシャッフル

  if (error) {
    throw new BattleError(
      BattleErrorCode.UNKNOWN_ERROR,
      `問題の取得に失敗しました: ${error.message}`
    );
  }

  if (!data || data.length < count) {
    throw new BattleError(
      BattleErrorCode.UNKNOWN_ERROR,
      `指定された難易度の問題が不足しています`
    );
  }

  // シャッフルして指定数を取得
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => q.id);
}

/**
 * 対戦ルーム管理サービス
 */
export class BattleRoomService {
  /**
   * 新しい対戦ルームを作成する
   */
  static async createRoom(
    hostUserId: string,
    hostSessionId: string,
    difficulty: DifficultyLevel
  ): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();
    const roomCode = generateRoomCode();

    try {
      // 問題IDを取得
      const questionIds = await getRandomQuestionIds(difficulty, MAX_QUESTIONS_PER_BATTLE);

      // ルームを作成
      const { data, error } = await supabase
        .from('battle_rooms')
        .insert({
          room_code: roomCode,
          difficulty,
          host_user_id: hostUserId,
          host_session_id: hostSessionId,
          question_ids: questionIds,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `ルームの作成に失敗しました: ${error.message}`
        );
      }

      return mapToBattleRoomInfo(data);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `ルームの作成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * ルームに参加する
   */
  static async joinRoom(
    roomCode: string,
    guestUserId: string,
    guestSessionId: string
  ): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      // ルームコードでルームを検索
      const { data: rooms, error: selectError } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (selectError || !rooms) {
        throw new BattleError(
          BattleErrorCode.ROOM_NOT_FOUND,
          '指定されたルームが見つかりません'
        );
      }

      const room = mapToBattleRoomInfo(rooms);

      // ルームの状態チェック
      if (room.status !== 'waiting') {
        throw new BattleError(
          BattleErrorCode.ROOM_ALREADY_STARTED,
          'このルームは既に開始されています'
        );
      }

      if (room.guestUserId) {
        throw new BattleError(
          BattleErrorCode.ROOM_FULL,
          'このルームは既に満員です'
        );
      }

      // 期限切れチェック
      const now = new Date();
      const expiresAt = new Date(room.expiresAt);
      if (now > expiresAt) {
        throw new BattleError(
          BattleErrorCode.ROOM_EXPIRED,
          'このルームは期限切れです'
        );
      }

      // ゲストとして参加
      const { data: updatedRoom, error: updateError } = await supabase
        .from('battle_rooms')
        .update({
          guest_user_id: guestUserId,
          guest_session_id: guestSessionId,
          status: 'ready',
        })
        .eq('id', room.id)
        .select()
        .single();

      if (updateError) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `ルームへの参加に失敗しました: ${updateError.message}`
        );
      }

      return mapToBattleRoomInfo(updatedRoom);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `ルームへの参加中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * ゲームを開始する（ホストのみ）
   */
  static async startGame(roomId: string): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .update({
          status: 'playing',
          started_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `ゲームの開始に失敗しました: ${error.message}`
        );
      }

      return mapToBattleRoomInfo(data);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `ゲームの開始中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * ルームから退出する
   */
  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      // ルームの情報を取得
      const { data: room, error: selectError } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (selectError || !room) {
        return; // ルームが存在しない場合は何もしない
      }

      const mappedRoom = mapToBattleRoomInfo(room);

      // ホストが退出した場合はルームを abandoned にする
      if (mappedRoom.hostUserId === userId) {
        await supabase
          .from('battle_rooms')
          .update({
            status: 'abandoned',
            finished_at: new Date().toISOString(),
          })
          .eq('id', roomId);
      }
      // ゲストが退出した場合はゲスト情報をクリア
      else if (mappedRoom.guestUserId === userId) {
        await supabase
          .from('battle_rooms')
          .update({
            guest_user_id: null,
            guest_session_id: null,
            status: mappedRoom.status === 'playing' ? 'abandoned' : 'waiting',
            finished_at: mappedRoom.status === 'playing' ? new Date().toISOString() : null,
          })
          .eq('id', roomId);
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
      // エラーは throw しない（ベストエフォート）
    }
  }

  /**
   * ルーム情報を取得する
   */
  static async getRoom(roomId: string): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !data) {
        throw new BattleError(
          BattleErrorCode.ROOM_NOT_FOUND,
          'ルームが見つかりません'
        );
      }

      return mapToBattleRoomInfo(data);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `ルーム情報の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * スコアを進行させる（RPC呼び出し）
   */
  static async advanceRoom(roomId: string): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.rpc('advance_battle_room', {
        p_room_id: roomId,
      });

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `スコアの進行に失敗しました: ${error.message}`
        );
      }

      return mapToBattleRoomInfo(data);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `スコアの進行中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
