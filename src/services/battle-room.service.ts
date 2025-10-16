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
   * ルームに参加する (RPC経由)
   */
  static async joinRoom(
    roomCode: string,
    guestUserId: string,
    guestSessionId: string
  ): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      // RPC関数を使用してセキュアに参加
      const { data, error } = await supabase.rpc('join_battle_room', {
        p_room_code: roomCode.toUpperCase(),
        p_guest_user_id: guestUserId,
        p_guest_session_id: guestSessionId,
      });

      if (error) {
        // RPC関数内のエラーメッセージをパース
        const errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('ROOM_NOT_FOUND')) {
          throw new BattleError(
            BattleErrorCode.ROOM_NOT_FOUND,
            '指定されたルームが見つかりません'
          );
        } else if (errorMessage.includes('ROOM_ALREADY_STARTED')) {
          throw new BattleError(
            BattleErrorCode.ROOM_ALREADY_STARTED,
            'このルームは既に開始されています'
          );
        } else if (errorMessage.includes('ROOM_FULL')) {
          throw new BattleError(
            BattleErrorCode.ROOM_FULL,
            'このルームは既に満員です'
          );
        } else if (errorMessage.includes('ROOM_EXPIRED')) {
          throw new BattleError(
            BattleErrorCode.ROOM_EXPIRED,
            'このルームは期限切れです'
          );
        } else {
          throw new BattleError(
            BattleErrorCode.UNKNOWN_ERROR,
            `ルームへの参加に失敗しました: ${errorMessage}`
          );
        }
      }

      if (!data) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          'ルームデータの取得に失敗しました'
        );
      }

      return mapToBattleRoomInfo(data);
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
   * ゲームを開始する（ホストのみ、RPC経由）
   */
  static async startGame(roomId: string, hostUserId: string): Promise<BattleRoomInfo> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.rpc('start_battle_room', {
        p_room_id: roomId,
        p_host_user_id: hostUserId,
      });

      if (error) {
        const errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('ROOM_NOT_FOUND')) {
          throw new BattleError(
            BattleErrorCode.ROOM_NOT_FOUND,
            'ルームが見つかりません'
          );
        } else if (errorMessage.includes('UNAUTHORIZED')) {
          throw new BattleError(
            BattleErrorCode.UNKNOWN_ERROR,
            'ホストのみがゲームを開始できます'
          );
        } else if (errorMessage.includes('ROOM_NOT_READY')) {
          throw new BattleError(
            BattleErrorCode.UNKNOWN_ERROR,
            'ゲストの参加を待っています'
          );
        } else if (errorMessage.includes('INVALID_STATE')) {
          throw new BattleError(
            BattleErrorCode.UNKNOWN_ERROR,
            'ゲームは既に開始されています'
          );
        } else {
          throw new BattleError(
            BattleErrorCode.UNKNOWN_ERROR,
            `ゲームの開始に失敗しました: ${errorMessage}`
          );
        }
      }

      if (!data) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          'ルームデータの取得に失敗しました'
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
   * ルームから退出する (RPC経由)
   * ゲストのみが退出可能（ホストが退出する場合は別の処理）
   */
  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase.rpc('leave_battle_room', {
        p_room_id: roomId,
        p_user_id: userId,
      });

      if (error) {
        const errorMessage = error.message || 'Unknown error';

        // ROOM_NOT_FOUND や UNAUTHORIZED は警告として記録するが例外にしない
        if (errorMessage.includes('ROOM_NOT_FOUND')) {
          console.warn('Room not found when leaving:', roomId);
          return;
        } else if (errorMessage.includes('UNAUTHORIZED')) {
          console.warn('User not authorized to leave room:', userId, roomId);
          return;
        } else if (errorMessage.includes('ROOM_ALREADY_STARTED')) {
          console.warn('Cannot leave room that has already started');
          return;
        } else {
          console.error('Failed to leave room:', errorMessage);
        }
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
