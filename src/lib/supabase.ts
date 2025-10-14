import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

type SupabaseClientType = ReturnType<typeof createClient<Database>>;

let supabase: SupabaseClientType | null = null;
let initializationError: Error | null = null;

const initializeSupabase = () => {
  if (supabase || initializationError) {
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    initializationError = new Error(
      'SupabaseのURLまたはAnon Keyが設定されていません。環境変数 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を確認してください。',
    );
    return;
  }

  try {
    // @ts-ignore - Database型の問題を一時的に回避
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知のエラーが発生しました。';
    initializationError = new Error(`Supabaseクライアントの初期化に失敗しました: ${message}`);
  }
};

initializeSupabase();

export const getSupabaseClient = (): SupabaseClientType => {
  if (initializationError) {
    throw initializationError;
  }

  if (!supabase) {
    throw new Error('Supabaseクライアントが初期化されていません');
  }

  return supabase;
};

export const getSupabaseInitializationError = (): Error | null => initializationError;

export const retrySupabaseInitialization = (): void => {
  supabase = null;
  initializationError = null;
  initializeSupabase();
};
