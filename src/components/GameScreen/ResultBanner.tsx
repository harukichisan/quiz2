import type { ResultStatus } from '../../hooks/useQuizGame';

type ResultBannerProps = {
  status: Exclude<ResultStatus, null>;
  answer: string;
};

const ResultBanner = ({ status, answer }: ResultBannerProps) => (
  <section className={`result-banner result-banner--${status}`}>
    <div className="result-banner__title">{status === 'correct' ? '○ 正解!' : '× 不正解...'}</div>
    <div className="result-banner__body">
      {status === 'correct' ? 'ナイス! 次の問題に進みます。' : `正解は「${answer}」でした。`}
    </div>
  </section>
);

export default ResultBanner;

