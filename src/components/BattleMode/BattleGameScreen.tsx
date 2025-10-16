import { useEffect, useState, useRef } from 'react';
import type { BattleRoomInfo, OpponentStatus } from '../../types/battle.types';
import { generateChoices, extractCharAtPosition, formatQuestionNumber } from '../../lib/battleUtils';

interface Question {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface BattleGameScreenProps {
  room: BattleRoomInfo;
  currentQuestion: Question;
  timeLeft: number;
  isAnswered: boolean;
  opponentStatus: OpponentStatus;
  onAnswer: (choice: string, isCorrect: boolean, answerTime: number) => void;
  playerScore: number;
  opponentScore: number;
}

export default function BattleGameScreen({
  room,
  currentQuestion,
  timeLeft,
  isAnswered,
  opponentStatus,
  onAnswer,
  playerScore,
  opponentScore,
}: BattleGameScreenProps) {
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 選択肢を生成し、各問題の開始時刻をリセット
  useEffect(() => {
    if (currentQuestion) {
      // 回答の最初の文字を正解として使用
      const correctChar = extractCharAtPosition(currentQuestion.answer, 0);
      const newChoices = generateChoices(correctChar);
      setChoices(newChoices);
      setSelectedChoice(null);

      // 各問題の開始時刻をリセット
      startTimeRef.current = Date.now();
    }
  }, [currentQuestion]);

  const handleChoiceClick = (choice: string) => {
    if (isAnswered) return;

    setSelectedChoice(choice);

    // 正解判定
    const correctChar = extractCharAtPosition(currentQuestion.answer, 0);
    const isCorrect = choice === correctChar;

    // 回答時間を計算（各問題の開始時刻から計算）
    const answerTime = Date.now() - startTimeRef.current;

    // 親コンポーネントに通知
    onAnswer(choice, isCorrect, answerTime);
  };

  // タイマーバーの幅を計算（10秒 = 10000ms）
  const timerPercentage = (timeLeft / 10000) * 100;

  return (
    <div className="battle-game">
      {/* ヘッダー */}
      <div className="battle-game__header">
        <div className="battle-game__progress">
          <span className="battle-game__question-number">
            問題 {formatQuestionNumber(room.currentQuestionIndex, room.questionIds.length)}
          </span>
        </div>

        <div className="battle-game__scores">
          <div className="battle-score battle-score--player">
            <span className="battle-score__label">あなた</span>
            <span className="battle-score__value">{playerScore}</span>
          </div>
          <div className="battle-score__separator">VS</div>
          <div className="battle-score battle-score--opponent">
            <span className="battle-score__label">相手</span>
            <span className="battle-score__value">{opponentScore}</span>
          </div>
        </div>
      </div>

      {/* タイマー */}
      <div className="battle-game__timer">
        <div
          className="battle-game__timer-bar"
          style={{
            width: `${timerPercentage}%`,
            backgroundColor: timerPercentage > 30 ? '#4CAF50' : '#f44336',
          }}
        />
      </div>

      {/* 問題カード */}
      <div className="battle-game__question">
        <div className="question-card">
          <span className="question-card__category">{currentQuestion.category}</span>
          <h2 className="question-card__text">{currentQuestion.question}</h2>
        </div>
      </div>

      {/* 選択肢 */}
      <div className="battle-game__choices">
        <div className="choice-grid">
          {choices.map((choice, index) => {
            const isSelected = selectedChoice === choice;
            const isCorrectChoice =
              isAnswered && choice === extractCharAtPosition(currentQuestion.answer, 0);

            return (
              <button
                key={index}
                type="button"
                className={`choice-button ${isSelected ? 'choice-button--selected' : ''} ${
                  isAnswered && isCorrectChoice ? 'choice-button--correct' : ''
                } ${isAnswered && isSelected && !isCorrectChoice ? 'choice-button--wrong' : ''}`}
                onClick={() => handleChoiceClick(choice)}
                disabled={isAnswered}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      {/* 相手の状態 */}
      <div className="battle-game__opponent-status">
        {opponentStatus.hasAnswered ? (
          <div className="opponent-status opponent-status--answered">
            <span className="opponent-status__icon">✓</span>
            <span className="opponent-status__text">相手が回答しました</span>
          </div>
        ) : (
          <div className="opponent-status opponent-status--waiting">
            <span className="opponent-status__icon">⏳</span>
            <span className="opponent-status__text">相手が回答中...</span>
          </div>
        )}
      </div>

      {/* 回答後の結果表示 */}
      {isAnswered && (
        <div className="battle-game__result">
          {selectedChoice === extractCharAtPosition(currentQuestion.answer, 0) ? (
            <div className="result-banner result-banner--correct">
              <span className="result-banner__icon">⭕</span>
              <span className="result-banner__text">正解!</span>
            </div>
          ) : (
            <div className="result-banner result-banner--wrong">
              <span className="result-banner__icon">❌</span>
              <span className="result-banner__text">不正解</span>
              <span className="result-banner__answer">
                正解: {extractCharAtPosition(currentQuestion.answer, 0)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
