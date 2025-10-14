// @ts-nocheck
import { getSupabaseClient } from '../lib/supabase';
import type { Database } from '../types/database.types';

export type Question = Database['public']['Tables']['questions']['Row'];

/**
 * 問題管理サービス
 */
export class QuestionService {
  /**
   * 問題IDから問題データを取得
   */
  static async getQuestionById(questionId: string): Promise<Question | null> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) {
        console.error('Failed to fetch question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching question:', error);
      return null;
    }
  }

  /**
   * 複数の問題IDから問題データを一括取得
   */
  static async getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (error) {
        console.error('Failed to fetch questions:', error);
        return [];
      }

      // IDの順序を保持するためにソート
      const questionMap = new Map(data.map((q) => [q.id, q]));
      return questionIds
        .map((id) => questionMap.get(id))
        .filter((q): q is Question => q !== undefined);
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  }
}
