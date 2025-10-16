export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BattleRoomStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'abandoned';
export type RawBattleRoomStatus =
  | BattleRoomStatus
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type DifficultyLevel = 'C' | 'B' | 'A' | 'S';

export type Database = {
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
        Relationships: []
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
          status: RawBattleRoomStatus
          current_question_index: number
          question_ids: string[]
          host_score: number
          guest_score: number
          created_at: string
          updated_at: string
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
          status?: RawBattleRoomStatus
          current_question_index?: number
          question_ids: string[]
          host_score?: number
          guest_score?: number
          created_at?: string
          updated_at?: string
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
          status?: RawBattleRoomStatus
          current_question_index?: number
          question_ids?: string[]
          host_score?: number
          guest_score?: number
          created_at?: string
          updated_at?: string
          expires_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      join_battle_room: {
        Args: {
          p_room_code: string
          p_guest_user_id: string
          p_guest_session_id: string
        }
        Returns: Database['public']['Tables']['battle_rooms']['Row']
      }
      start_battle_room: {
        Args: {
          p_room_id: string
          p_host_user_id: string
        }
        Returns: Database['public']['Tables']['battle_rooms']['Row']
      }
      leave_battle_room: {
        Args: {
          p_room_id: string
          p_user_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never
