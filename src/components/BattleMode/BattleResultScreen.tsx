import type { BattleResult } from '../../types/battle.types';
import { determineWinner } from '../../lib/battleUtils';

interface BattleResultScreenProps {
  result: BattleResult;
  isHost: boolean;
  onRematch?: () => void;
  onBackToLobby: () => void;
}

export default function BattleResultScreen({
  result,
  isHost,
  onRematch,
  onBackToLobby,
}: BattleResultScreenProps) {
  const winner = determineWinner(result.hostScore, result.guestScore);
  const playerIsHost = isHost;
  const playerWon =
    (playerIsHost && winner === 'host') ||
    (!playerIsHost && winner === 'guest');
  const isDraw = winner === 'draw';

  const playerStats = isHost ? result.playerStats : result.opponentStats;
  const opponentStats = isHost ? result.opponentStats : result.playerStats;
  const playerScore = isHost ? result.hostScore : result.guestScore;
  const opponentScore = isHost ? result.guestScore : result.hostScore;

  return (
    <div className="surface surface--result">
      <div className="battle-result">
        {/* 勝敗表示 */}
        <div className={`battle-result__header ${
          isDraw ? 'battle-result__header--draw' :
          playerWon ? 'battle-result__header--win' : 'battle-result__header--lose'
        }`}>
          {isDraw && (
            <>
              <h1 className="battle-result__title">引き分け</h1>
              <p className="battle-result__subtitle">互角の戦いでした!</p>
            </>
          )}
          {!isDraw && playerWon && (
            <>
              <span className="battle-result__icon">🎉</span>
              <h1 className="battle-result__title">勝利!</h1>
              <p className="battle-result__subtitle">おめでとうございます!</p>
            </>
          )}
          {!isDraw && !playerWon && (
            <>
              <span className="battle-result__icon">😢</span>
              <h1 className="battle-result__title">敗北</h1>
              <p className="battle-result__subtitle">次は頑張りましょう!</p>
            </>
          )}
        </div>

        {/* スコア表示 */}
        <div className="battle-result__scores">
          <div className={`score-card ${playerWon && !isDraw ? 'score-card--winner' : ''}`}>
            <span className="score-card__label">あなた</span>
            <span className="score-card__score">{playerScore}</span>
            <span className="score-card__total">/ {result.totalQuestions}</span>
          </div>

          <div className="score-card__divider">-</div>

          <div className={`score-card ${!playerWon && !isDraw ? 'score-card--winner' : ''}`}>
            <span className="score-card__label">相手</span>
            <span className="score-card__score">{opponentScore}</span>
            <span className="score-card__total">/ {result.totalQuestions}</span>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="battle-result__stats">
          <h2 className="battle-result__stats-title">対戦成績</h2>

          <div className="stats-comparison">
            {/* あなたの統計 */}
            <div className="stats-column">
              <h3 className="stats-column__title">あなた</h3>
              <dl className="stats-list">
                <div className="stats-list__item">
                  <dt className="stats-list__label">正解数</dt>
                  <dd className="stats-list__value">{playerStats.correctAnswers}問</dd>
                </div>
                <div className="stats-list__item">
                  <dt className="stats-list__label">平均回答時間</dt>
                  <dd className="stats-list__value">
                    {(playerStats.averageAnswerTime / 1000).toFixed(2)}秒
                  </dd>
                </div>
                <div className="stats-list__item">
                  <dt className="stats-list__label">最速回答</dt>
                  <dd className="stats-list__value">
                    {(playerStats.fastestAnswer / 1000).toFixed(2)}秒
                  </dd>
                </div>
              </dl>
            </div>

            {/* 相手の統計 */}
            <div className="stats-column">
              <h3 className="stats-column__title">相手</h3>
              <dl className="stats-list">
                <div className="stats-list__item">
                  <dt className="stats-list__label">正解数</dt>
                  <dd className="stats-list__value">{opponentStats.correctAnswers}問</dd>
                </div>
                <div className="stats-list__item">
                  <dt className="stats-list__label">平均回答時間</dt>
                  <dd className="stats-list__value">
                    {(opponentStats.averageAnswerTime / 1000).toFixed(2)}秒
                  </dd>
                </div>
                <div className="stats-list__item">
                  <dt className="stats-list__label">最速回答</dt>
                  <dd className="stats-list__value">
                    {(opponentStats.fastestAnswer / 1000).toFixed(2)}秒
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="battle-result__actions">
          {onRematch && (
            <button
              type="button"
              className="button button--large button--primary"
              onClick={onRematch}
            >
              もう一度対戦
            </button>
          )}

          <button
            type="button"
            className="button button--large"
            onClick={onBackToLobby}
          >
            ロビーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
