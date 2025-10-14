import { useState, useEffect } from 'react';

const SESSION_ID_KEY = 'battle_session_id';

// UUID v4 polyfill for browsers that don't support crypto.randomUUID()
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * セッションIDを管理するカスタムフック
 * localStorageに永続化されたセッションIDを返す
 * セッションIDはデバイス単位の識別子として使用される
 */
export function useSessionId(): string {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    try {
      // localStorageからセッションIDを取得
      let id = localStorage.getItem(SESSION_ID_KEY);

      if (!id) {
        // セッションIDが存在しない場合は新規生成
        id = generateUUID();
        localStorage.setItem(SESSION_ID_KEY, id);
      }

      setSessionId(id);
    } catch (error) {
      // localStorageが使えない場合は一時的なIDを生成
      console.warn('localStorage is not available. Using temporary session ID:', error);
      setSessionId(generateUUID());
    }
  }, []);

  return sessionId;
}

/**
 * セッションIDをクリアする関数
 * テスト用途やログアウト時に使用
 */
export function clearSessionId(): void {
  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear session ID:', error);
  }
}
