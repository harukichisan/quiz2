import ErrorNotice from './ErrorNotice';

type ResultScreenProps = {
  score: number;
  totalQuestions: number;
  percentage: number;
  message: string;
  isLoading: boolean;
  error?: string | null;
  onRetry: () => void;
  onChangeDifficulty: () => void;
};

const ResultScreen = ({
  score,
  totalQuestions,
  percentage,
  message,
  isLoading,
  error,
  onRetry,
  onChangeDifficulty,
}: ResultScreenProps) => (
  <div className="surface surface--result">
    <span className="badge badge--soft">おつかれさまでした</span>
    <h1 className="heading-xl">結果発表</h1>
    <div className="score-card">
      <div
        className="score-card__circle"
        style={{ '--score-percent': percentage } as React.CSSProperties}
        aria-hidden="true"
      >
        <div className="score-card__value">
          <span className="score-card__score">{score}</span>
          <span className="score-card__total">/{totalQuestions}</span>
        </div>
      </div>
      <p className="score-card__percentage" aria-label={`正答率 ${percentage}パーセント`}>
        {percentage}%
      </p>
      <p className="score-card__message">{message}</p>
    </div>
    <div className="result-actions">
      {error && <ErrorNotice message={error} />}
      <button type="button" className="button button--large" onClick={onRetry} disabled={isLoading}>
        {isLoading ? '読み込み中...' : 'もう一度チャレンジ'}
      </button>
      <button type="button" className="button button--ghost" onClick={onChangeDifficulty}>
        難易度を選び直す
      </button>
    </div>
  </div>
);

export default ResultScreen;
