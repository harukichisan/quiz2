import type { DifficultyLevel } from '../../types/database.types';

interface ModeSelectScreenProps {
  onSelectSinglePlayer: () => void;
  onSelectBattleMode: () => void;
}

export default function ModeSelectScreen({
  onSelectSinglePlayer,
  onSelectBattleMode,
}: ModeSelectScreenProps) {
  return (
    <div className="surface surface--start">
      <div className="surface__intro">
        <span className="badge">ひらがな4択クイズ</span>
        <h1 className="heading-hero">シンプルクイズ</h1>
        <p className="lede">
          1人で遊ぶか、友達と対戦するか選んでください!
        </p>
      </div>

      <div className="mode-selector">
        <button
          type="button"
          className="mode-button mode-button--single"
          onClick={onSelectSinglePlayer}
        >
          <div className="mode-button__icon">🎯</div>
          <div className="mode-button__content">
            <h2 className="mode-button__title">1人で遊ぶ</h2>
            <p className="mode-button__description">
              20問のクイズに挑戦して高得点を目指そう
            </p>
          </div>
        </button>

        <button
          type="button"
          className="mode-button mode-button--battle"
          onClick={onSelectBattleMode}
        >
          <div className="mode-button__icon">⚔️</div>
          <div className="mode-button__content">
            <h2 className="mode-button__title">対戦モード</h2>
            <p className="mode-button__description">
              友達と早押しクイズで対決!
            </p>
          </div>
        </button>
      </div>

      <ul className="feature-list">
        <li>対戦モードでは2人で同じ問題に挑戦</li>
        <li>早く正解した方がポイント獲得</li>
        <li>10問勝負でスリル満点のバトル</li>
      </ul>
    </div>
  );
}
