import type { DifficultyLevel } from '../../hooks/useQuizGame';

const difficultyLabelMap: Record<DifficultyLevel, string> = {
  C: 'C (かんたん)',
  B: 'B (ふつう)',
  A: 'A (むずかしい)',
  S: 'S (超むずかしい)',
};

type GameHeaderProps = {
  currentQuestionNumber: number;
  totalQuestions: number;
  category?: string | null;
  difficulty?: DifficultyLevel | null;
  score: number;
  timeLeft: number;
  timerPercent: number;
  progressPercent: number;
};

const GameHeader = ({
  currentQuestionNumber,
  totalQuestions,
  category,
  difficulty,
  score,
  timeLeft,
  timerPercent,
  progressPercent,
}: GameHeaderProps) => (
  <header className="game-header">
    <div className="game-progress">
      <div className="game-progress__top">
        <span className="progress-label">
          問題 {currentQuestionNumber} / {totalQuestions}
        </span>
        <span className="progress-label progress-label--muted">カテゴリ: {category ?? '---'}</span>
        <span className="progress-label progress-label--muted">
          難易度: {difficulty ? difficultyLabelMap[difficulty] : '---'}
        </span>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
    <div className="game-stats">
      <div className="stat-chip">
        <span className="stat-label">スコア</span>
        <span className="stat-value">{score} 点</span>
      </div>
      <div className={`stat-chip ${timeLeft <= 3 ? 'stat-chip--danger' : ''}`}>
        <span className="stat-label">残り時間</span>
        <span className="stat-value">{timeLeft} 秒</span>
        <div className="timer-bar" aria-hidden="true">
          <div className="timer-bar__fill" style={{ width: `${timerPercent}%` }} />
        </div>
      </div>
    </div>
  </header>
);

export default GameHeader;
