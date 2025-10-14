import { useState, useCallback, useEffect, useRef } from 'react';
import { BattleRoomService } from '../services/battle-room.service';
import { BattleAnswerService } from '../services/battle-answer.service';
import type { BattleRoomInfo, BattleAnswer } from '../types/battle.types';
import { BattleError } from '../types/battle.types';

interface UseBattleGameOptions {
  room: BattleRoomInfo | null;
  userId: string;
  sessionId: string;
  onRoomUpdate?: (room: BattleRoomInfo) => void;
}

interface UseBattleGameReturn {
  currentQuestion: any | null;
  timeLeft: number;
  isAnswered: boolean;
  playerAnswer: BattleAnswer | null;
  opponentAnswer: BattleAnswer | null;
  isAdvancing: boolean;
  error: string | null;
  recordAnswer: (questionId: string, isCorrect: boolean, answerTimeMs: number) => Promise<void>;
  advanceToNextQuestion: () => Promise<void>;
  resetTimer: () => void;
}

const QUESTION_TIME_LIMIT = 10000; // 10秒

/**
 * 対戦ゲーム管理フック
 */
export function useBattleGame({
  room,
  userId,
  sessionId,
  onRoomUpdate,
}: UseBattleGameOptions): UseBattleGameReturn {
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isAnswered, setIsAnswered] = useState(false);
  const [playerAnswer, setPlayerAnswer] = useState<BattleAnswer | null>(null);
  const [opponentAnswer, setOpponentAnswer] = useState<BattleAnswer | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // タイマーをリセット
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    setTimeLeft(QUESTION_TIME_LIMIT);
    setIsAnswered(false);
    setPlayerAnswer(null);
    setOpponentAnswer(null);
    startTimeRef.current = Date.now();
  }, []);

  // タイマーを開始
  useEffect(() => {
    if (!room || room.status !== 'playing' || isAnswered) {
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, QUESTION_TIME_LIMIT - elapsed);

      setTimeLeft(remaining);

      if (remaining > 0) {
        timerRef.current = requestAnimationFrame(animate);
      } else {
        // タイムアウト時は自動的に不正解として記録
        if (room && !isAnswered) {
          const questionId = room.questionIds[room.currentQuestionIndex];
          recordAnswer(questionId, false, QUESTION_TIME_LIMIT);
        }
      }
    };

    timerRef.current = requestAnimationFrame(animate);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [room, isAnswered]);

  // 現在の問題を更新
  useEffect(() => {
    if (!room || room.status !== 'playing') {
      setCurrentQuestion(null);
      return;
    }

    const questionId = room.questionIds[room.currentQuestionIndex];
    if (questionId) {
      // 問題情報を取得（この部分は実際の実装に合わせて調整）
      setCurrentQuestion({ id: questionId });
    }
  }, [room]);

  // 回答を記録
  const recordAnswer = useCallback(
    async (questionId: string, isCorrect: boolean, answerTimeMs: number) => {
      if (!room || isAnswered) {
        return;
      }

      setError(null);

      try {
        const answer = await BattleAnswerService.recordAnswer(
          room.id,
          userId,
          sessionId,
          room.currentQuestionIndex,
          questionId,
          isCorrect,
          answerTimeMs
        );

        setPlayerAnswer(answer);
        setIsAnswered(true);

        // タイマーを停止
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
        }
      } catch (err) {
        const errorMessage =
          err instanceof BattleError ? err.message : '回答の記録に失敗しました';
        setError(errorMessage);
      }
    },
    [room, userId, sessionId, isAnswered]
  );

  // 次の問題に進む
  const advanceToNextQuestion = useCallback(async () => {
    if (!room || isAdvancing) {
      return;
    }

    setIsAdvancing(true);
    setError(null);

    try {
      // RPC呼び出しでスコアを進行
      const updatedRoom = await BattleRoomService.advanceRoom(room.id);

      // ルーム情報を更新
      if (onRoomUpdate) {
        onRoomUpdate(updatedRoom);
      }

      // 次の問題に進む準備
      if (updatedRoom.status === 'playing') {
        resetTimer();
      }
    } catch (err) {
      const errorMessage =
        err instanceof BattleError ? err.message : '次の問題への進行に失敗しました';
      setError(errorMessage);
    } finally {
      setIsAdvancing(false);
    }
  }, [room, isAdvancing, onRoomUpdate, resetTimer]);

  // 相手の回答状態を監視
  useEffect(() => {
    if (!room || !isAnswered) {
      return;
    }

    // 相手の回答を取得
    const fetchOpponentAnswer = async () => {
      try {
        const answers = await BattleAnswerService.getAnswersByQuestion(
          room.id,
          room.currentQuestionIndex
        );

        const opponent = answers.find((a) => a.playerUserId !== userId);
        if (opponent) {
          setOpponentAnswer(opponent);

          // 両者が回答したら自動的に次に進む
          if (playerAnswer && opponent) {
            setTimeout(() => {
              advanceToNextQuestion();
            }, 2000); // 2秒後に進行
          }
        }
      } catch (err) {
        console.error('Failed to fetch opponent answer:', err);
      }
    };

    fetchOpponentAnswer();
    const interval = setInterval(fetchOpponentAnswer, 500);

    return () => clearInterval(interval);
  }, [room, isAnswered, userId, playerAnswer, advanceToNextQuestion]);

  return {
    currentQuestion,
    timeLeft,
    isAnswered,
    playerAnswer,
    opponentAnswer,
    isAdvancing,
    error,
    recordAnswer,
    advanceToNextQuestion,
    resetTimer,
  };
}
