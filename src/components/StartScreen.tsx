import { useEffect, useState } from 'react';
import type { DifficultyLevel } from '../hooks/useQuizGame';
import ErrorNotice from './ErrorNotice';

type StartScreenProps = {
  isLoading: boolean;
  error?: string | null;
  selectedDifficulty: DifficultyLevel;
  onStart: (difficulty: DifficultyLevel) => void | Promise<void>;
};

const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyLevel;
  label: string;
  description: string;
}> = [
  { value: 'C', label: 'かんたん', description: '基本的な問題が中心' },
  { value: 'B', label: 'ふつう', description: '標準レベルで腕試し' },
  { value: 'A', label: 'むずかしい', description: '知識に自信がある人向け' },
  { value: 'S', label: '超むずかしい', description: '最難関問題に挑戦!' },
];

const StartScreen = ({ isLoading, error, selectedDifficulty, onStart }: StartScreenProps) => {
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyLevel>(selectedDifficulty);

  useEffect(() => {
    setActiveDifficulty(selectedDifficulty);
  }, [selectedDifficulty]);

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    if (isLoading) return;
    setActiveDifficulty(difficulty);
  };

  const handleStart = () => {
    onStart(activeDifficulty);
  };

  return (
    <div className="surface surface--start">
      <div className="surface__intro">
        <span className="badge">ひらがな4択クイズ</span>
        <h1 className="heading-hero">シンプルクイズ</h1>
        <p className="lede">
          ランダムに出題される20問を、4つの文字から選んで素早く正解しよう!
        </p>
      </div>
      <ul className="feature-list">
        <li>毎回違う順番で出題されるので飽きずに挑戦できる</li>
        <li>10秒タイマーで集中力アップ、緊張感のあるプレイ体験</li>
        <li>カテゴリ表示で得意・不得意のチェックもかんたん</li>
      </ul>
      <section className="difficulty-selector" aria-label="難易度を選択">
        <h2 className="difficulty-selector__title">難易度を選ぶ</h2>
        <div className="difficulty-selector__options">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`difficulty-option ${activeDifficulty === option.value ? 'is-active' : ''}`}
              onClick={() => handleDifficultySelect(option.value)}
              disabled={isLoading}
              aria-pressed={activeDifficulty === option.value}
            >
              <span className="difficulty-option__value">{option.value}</span>
              <span className="difficulty-option__label">{option.label}</span>
              <span className="difficulty-option__description">{option.description}</span>
            </button>
          ))}
        </div>
        <p className="difficulty-selector__note">
          選んだ難易度に加えて、ときどき1段階上の問題も登場します。
        </p>
      </section>
      {error && <ErrorNotice message={error} />}
      <button
        type="button"
        className="button button--large"
        onClick={handleStart}
        disabled={isLoading}
      >
        {isLoading ? '読み込み中...' : 'ゲームを始める'}
      </button>
    </div>
  );
};

export default StartScreen;
