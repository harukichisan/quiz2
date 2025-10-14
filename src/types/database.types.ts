export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BattleRoomStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'abandoned';
export type DifficultyLevel = 'C' | 'B' | 'A' | 'S';

export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string
          question: string
          answer: string
          category: string
          created_at: string
          difficulty: DifficultyLevel
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category: string
          created_at?: string
          difficulty: DifficultyLevel
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          category?: string
          created_at?: string
          difficulty?: DifficultyLevel
        }
      }
      battle_rooms: {
        Row: {
          id: string
          room_code: string
          difficulty: DifficultyLevel
          host_user_id: string
          guest_user_id: string | null
          host_session_id: string
          guest_session_id: string | null
          status: BattleRoomStatus
          current_question_index: number
          question_ids: string[]
          host_score: number
          guest_score: number
          created_at: string
          expires_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          room_code: string
          difficulty: DifficultyLevel
          host_user_id: string
          guest_user_id?: string | null
          host_session_id: string
          guest_session_id?: string | null
          status?: BattleRoomStatus
          current_question_index?: number
          question_ids: string[]
          host_score?: number
          guest_score?: number
          created_at?: string
          expires_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          room_code?: string
          difficulty?: DifficultyLevel
          host_user_id?: string
          guest_user_id?: string | null
          host_session_id?: string
          guest_session_id?: string | null
          status?: BattleRoomStatus
          current_question_index?: number
          question_ids?: string[]
          host_score?: number
          guest_score?: number
          created_at?: string
          expires_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
      }
      battle_answers: {
        Row: {
          id: string
          room_id: string
          player_user_id: string
          player_session_id: string
          question_index: number
          question_id: string
          is_correct: boolean
          answer_time_ms: number
          answered_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_user_id: string
          player_session_id: string
          question_index: number
          question_id: string
          is_correct: boolean
          answer_time_ms: number
          answered_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_user_id?: string
          player_session_id?: string
          question_index?: number
          question_id?: string
          is_correct?: boolean
          answer_time_ms?: number
          answered_at?: string
        }
      }
    }
    Functions: {
      advance_battle_room: {
        Args: {
          p_room_id: string
        }
        Returns: Database['public']['Tables']['battle_rooms']['Row']
      }
      delete_expired_battle_rooms: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
