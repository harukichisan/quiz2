/**
 * 対戦モード用のユーティリティ関数
 */

// ひらがな文字セット
const HIRAGANA_CHARS = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';

/**
 * 正解文字と3つのダミー文字を含む選択肢を生成する
 * @param correctChar 正解の文字
 * @returns 4つの選択肢（シャッフル済み）
 */
export function generateChoices(correctChar: string): string[] {
  const choices = new Set<string>();
  choices.add(correctChar);

  // ダミー文字を3つ生成
  while (choices.size < 4) {
    const randomIndex = Math.floor(Math.random() * HIRAGANA_CHARS.length);
    const randomChar = HIRAGANA_CHARS[randomIndex];

    // 正解文字と異なる文字のみ追加
    if (randomChar !== correctChar) {
      choices.add(randomChar);
    }
  }

  // 配列に変換してシャッフル
  const choicesArray = Array.from(choices);
  return shuffleArray(choicesArray);
}

/**
 * 配列をシャッフルする（Fisher-Yates アルゴリズム）
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * ひらがなの回答から正解判定のための文字を抽出する
 * @param answer ひらがなの回答文字列
 * @param position 抽出する位置（0始まり）
 * @returns 抽出された文字、または回答が短い場合は最初の文字
 */
export function extractCharAtPosition(answer: string, position: number): string {
  if (position >= answer.length) {
    return answer[0] || 'あ';
  }
  return answer[position];
}

/**
 * 回答時間をミリ秒で取得
 */
export function getAnswerTime(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * タイムアウト判定
 */
export function isTimeout(elapsedTime: number, timeLimit: number): boolean {
  return elapsedTime >= timeLimit;
}

/**
 * 問題番号を表示用にフォーマット
 */
export function formatQuestionNumber(current: number, total: number): string {
  return `${current + 1} / ${total}`;
}

/**
 * スコア差を計算
 */
export function calculateScoreDifference(score1: number, score2: number): number {
  return Math.abs(score1 - score2);
}

/**
 * 勝者を判定
 */
export function determineWinner(
  hostScore: number,
  guestScore: number
): 'host' | 'guest' | 'draw' {
  if (hostScore > guestScore) return 'host';
  if (guestScore > hostScore) return 'guest';
  return 'draw';
}
