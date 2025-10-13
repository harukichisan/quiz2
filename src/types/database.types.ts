export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          difficulty: "C" | "B" | "A" | "S"
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category: string
          created_at?: string
          difficulty: "C" | "B" | "A" | "S"
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          category?: string
          created_at?: string
          difficulty?: "C" | "B" | "A" | "S"
        }
      }
    }
  }
}
