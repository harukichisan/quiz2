import { getSupabaseClient } from '../lib/supabase';
import {
  BattleError,
  BattleErrorCode,
  mapToBattleAnswer,
  type BattleAnswer,
} from '../types/battle.types';

/**
 * 対戦中の回答管理サービス
 */
export class BattleAnswerService {
  /**
   * 回答を記録する
   */
  static async recordAnswer(
    roomId: string,
    playerUserId: string,
    playerSessionId: string,
    questionIndex: number,
    questionId: string,
    isCorrect: boolean,
    answerTimeMs: number
  ): Promise<BattleAnswer> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_answers')
        .upsert(
          {
            room_id: roomId,
            player_user_id: playerUserId,
            player_session_id: playerSessionId,
            question_index: questionIndex,
            question_id: questionId,
            is_correct: isCorrect,
            answer_time_ms: answerTimeMs,
            answered_at: new Date().toISOString(),
          },
          {
            onConflict: 'room_id,player_user_id,question_index',
          }
        )
        .select()
        .single();

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `回答の記録に失敗しました: ${error.message}`
        );
      }

      return mapToBattleAnswer(data);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `回答の記録中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * ルーム内のすべての回答を取得する
   */
  static async getRoomAnswers(roomId: string): Promise<BattleAnswer[]> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_answers')
        .select('*')
        .eq('room_id', roomId)
        .order('question_index', { ascending: true })
        .order('answered_at', { ascending: true });

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `回答の取得に失敗しました: ${error.message}`
        );
      }

      return (data || []).map(mapToBattleAnswer);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `回答の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 特定の問題に対する回答を取得する
   */
  static async getAnswersByQuestion(
    roomId: string,
    questionIndex: number
  ): Promise<BattleAnswer[]> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_answers')
        .select('*')
        .eq('room_id', roomId)
        .eq('question_index', questionIndex);

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `回答の取得に失敗しました: ${error.message}`
        );
      }

      return (data || []).map(mapToBattleAnswer);
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `回答の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * プレイヤーの回答統計を計算する
   */
  static async getPlayerStats(roomId: string, playerUserId: string) {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('battle_answers')
        .select('is_correct, answer_time_ms')
        .eq('room_id', roomId)
        .eq('player_user_id', playerUserId);

      if (error) {
        throw new BattleError(
          BattleErrorCode.UNKNOWN_ERROR,
          `統計の取得に失敗しました: ${error.message}`
        );
      }

      const answers = data || [];
      const correctAnswers = answers.filter((a) => a.is_correct).length;
      const totalTime = answers.reduce((sum, a) => sum + a.answer_time_ms, 0);
      const averageAnswerTime = answers.length > 0 ? totalTime / answers.length : 0;
      const fastestAnswer = answers.length > 0 ? Math.min(...answers.map((a) => a.answer_time_ms)) : 0;

      return {
        correctAnswers,
        averageAnswerTime,
        fastestAnswer,
      };
    } catch (error) {
      if (error instanceof BattleError) {
        throw error;
      }
      throw new BattleError(
        BattleErrorCode.UNKNOWN_ERROR,
        `統計の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
