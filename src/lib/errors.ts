import type { PostgrestError } from '@supabase/supabase-js';

const DEFAULT_FETCH_ERROR_MESSAGE =
  '問題の読み込みに失敗しました。時間をおいて再試行してください。';
const OFFLINE_ERROR_MESSAGE =
  'ネットワークに接続できませんでした。接続を確認してから再試行してください。';

const isPostgrestError = (error: unknown): error is PostgrestError =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      'code' in error &&
      'details' in error &&
      'hint' in error,
  );

export const createFriendlyErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    return OFFLINE_ERROR_MESSAGE;
  }

  if (isPostgrestError(error)) {
    switch (error.code) {
      case '42501':
        return 'データベースの権限エラーが発生しました。Supabaseのポリシー設定を確認してください。';
      case 'PGRST301':
        return 'データベースとの通信がタイムアウトしました。時間をおいて再試行してください。';
      default:
        return `データベースエラーが発生しました: ${error.message}`;
    }
  }

  if (error instanceof Error) {
    if (/Failed to fetch|NetworkError|load failed/i.test(error.message)) {
      return 'Supabaseに接続できませんでした。ネットワーク状態を確認してください。';
    }
    return error.message;
  }

  return DEFAULT_FETCH_ERROR_MESSAGE;
};

