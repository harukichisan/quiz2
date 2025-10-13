const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっー';

export const TOTAL_QUESTIONS = 20;
export const QUESTION_TIME = 10;

export const pickChoices = (correctChar: string): string[] => {
  const choiceSet = new Set<string>([correctChar]);
  while (choiceSet.size < 4) {
    const randomChar = HIRAGANA[Math.floor(Math.random() * HIRAGANA.length)];
    choiceSet.add(randomChar);
  }
  return Array.from(choiceSet).sort(() => Math.random() - 0.5);
};

export const evaluateResultMessage = (score: number, total: number): string => {
  const percentage = total ? (score / total) * 100 : 0;

  if (percentage === 100) return 'パーフェクト!すごい!!';
  if (percentage >= 80) return 'すごい!よくできました!';
  if (percentage >= 60) return 'いい感じ!がんばった!';
  if (percentage >= 40) return 'まずまずです!';
  return 'もう一度チャレンジ!';
};

