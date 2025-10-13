import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from '../types/database.types';
import { getSupabaseClient, getSupabaseInitializationError } from '../lib/supabase';
import { createFriendlyErrorMessage } from '../lib/errors';
import { pickChoices, QUESTION_TIME, TOTAL_QUESTIONS, evaluateResultMessage } from '../lib/gameUtils';

export type Question = Database['public']['Tables']['questions']['Row'];
export type DifficultyLevel = Question['difficulty'];
export type GameStatus = 'start' | 'playing' | 'finished';
export type ResultStatus = 'correct' | 'incorrect' | null;

const DIFFICULTY_ORDER: DifficultyLevel[] = ['C', 'B', 'A', 'S'];
const BONUS_QUESTION_RATIO = 0.2;
const MIN_BONUS_QUESTIONS = 1;

const shuffleArray = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const getNextDifficulty = (difficulty: DifficultyLevel): DifficultyLevel | null => {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  if (index === -1 || index === DIFFICULTY_ORDER.length - 1) {
    return null;
  }
  return DIFFICULTY_ORDER[index + 1];
};

const buildQuestionSet = (source: Question[], difficulty: DifficultyLevel): Question[] => {
  const basePool = shuffleArray(source.filter((question) => question.difficulty === difficulty));
  const nextDifficulty = getNextDifficulty(difficulty);
  const advancedPool = nextDifficulty
    ? shuffleArray(source.filter((question) => question.difficulty === nextDifficulty))
    : [];

  const desiredAdvancedCount =
    nextDifficulty && advancedPool.length
      ? Math.min(
          Math.max(Math.round(TOTAL_QUESTIONS * BONUS_QUESTION_RATIO), MIN_BONUS_QUESTIONS),
          advancedPool.length,
        )
      : 0;

  const selectedAdvanced = advancedPool.slice(0, desiredAdvancedCount);
  const selectedBase = basePool.slice(0, TOTAL_QUESTIONS - selectedAdvanced.length);

  let combined = [...selectedBase, ...selectedAdvanced];

  if (combined.length < TOTAL_QUESTIONS) {
    const remaining = shuffleArray(
      source.filter((question) => !combined.some((picked) => picked.id === question.id)),
    );
    combined = [...combined, ...remaining.slice(0, TOTAL_QUESTIONS - combined.length)];
  }

  return shuffleArray(combined).slice(0, TOTAL_QUESTIONS);
};

type FetchQuestionsResult = {
  success: boolean;
};

export const useQuizGame = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [choices, setChoices] = useState<string[]>([]);
  const [showResult, setShowResult] = useState<ResultStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('C');

  const totalQuestions = questions.length || TOTAL_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const currentAnswer = currentQuestion?.answer ?? '';

  const fetchQuestions = useCallback(
    async (difficulty: DifficultyLevel): Promise<FetchQuestionsResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const initError = getSupabaseInitializationError();
        if (initError) {
          throw initError;
        }

        const client = getSupabaseClient();
        const nextDifficulty = getNextDifficulty(difficulty);
        const targetDifficulties = nextDifficulty ? [difficulty, nextDifficulty] : [difficulty];

        let query = client
          .from('questions')
          .select('id, question, answer, category, difficulty, created_at')
          .limit(TOTAL_QUESTIONS * 3);

        if (nextDifficulty) {
          query = query.in('difficulty', targetDifficulties);
        } else {
          query = query.eq('difficulty', difficulty);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        if (!data || data.length === 0) {
          throw new Error('問題データが見つかりませんでした');
        }

        const normalized = data as Question[];
        const preparedQuestions = buildQuestionSet(normalized, difficulty);

        if (!preparedQuestions.length) {
          throw new Error('選択した難易度の問題が見つかりませんでした');
        }

        setQuestions(preparedQuestions);
        return { success: true };
      } catch (err) {
        console.error('Failed to fetch questions from Supabase:', err);
        setError(createFriendlyErrorMessage(err));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetQuestionState = useCallback(() => {
    setInputText('');
    setTimeLeft(QUESTION_TIME);
    setShowResult(null);
    setChoices([]);
  }, []);

  const moveToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < questions.length) {
        return nextIndex;
      }
      setGameStatus('finished');
      return prev;
    });
    resetQuestionState();
  }, [questions.length, resetQuestionState]);

  const handleIncorrect = useCallback(() => {
    if (showResult) return;
    setShowResult('incorrect');
    window.setTimeout(() => {
      moveToNextQuestion();
    }, 900);
  }, [moveToNextQuestion, showResult]);

  const goToStart = useCallback(() => {
    setGameStatus('start');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    resetQuestionState();
    setError(null);
    setIsLoading(false);
  }, [resetQuestionState]);

  const startGame = useCallback(
    async (difficulty?: DifficultyLevel) => {
      const effectiveDifficulty = difficulty ?? selectedDifficulty;
      setSelectedDifficulty(effectiveDifficulty);

      const { success } = await fetchQuestions(effectiveDifficulty);
      if (success) {
        setError(null);
        setGameStatus('playing');
        setCurrentQuestionIndex(0);
        setScore(0);
        resetQuestionState();
      }
    },
    [fetchQuestions, resetQuestionState, selectedDifficulty],
  );

  const handleChoiceClick = useCallback(
    (selectedChar: string) => {
      if (!currentAnswer || showResult) return;

      const nextCharIndex = inputText.length;
      const correctChar = currentAnswer[nextCharIndex];

      if (selectedChar === correctChar) {
        const newInputText = inputText + selectedChar;
        setInputText(newInputText);
        setTimeLeft(QUESTION_TIME);

        if (newInputText === currentAnswer) {
          setScore((prev) => prev + 1);
          setShowResult('correct');
          window.setTimeout(() => {
            moveToNextQuestion();
          }, 900);
        }
      } else {
        handleIncorrect();
      }
    },
    [currentAnswer, handleIncorrect, inputText, moveToNextQuestion, showResult],
  );

  useEffect(() => {
    if (gameStatus !== 'playing' || !currentQuestion || showResult) {
      return;
    }

    const nextCharIndex = inputText.length;
    if (nextCharIndex < currentAnswer.length) {
      const correctChar = currentAnswer[nextCharIndex];
      setChoices(pickChoices(correctChar));
    } else {
      setChoices([]);
    }
  }, [currentAnswer, currentQuestion, gameStatus, inputText, showResult]);

  useEffect(() => {
    if (gameStatus !== 'playing' || showResult) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleIncorrect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameStatus, handleIncorrect, showResult]);

  const progressPercent = useMemo(() => {
    const answeredCount = Math.min(currentQuestionIndex + (showResult ? 1 : 0), totalQuestions);
    return totalQuestions ? Math.min((answeredCount / totalQuestions) * 100, 100) : 0;
  }, [currentQuestionIndex, showResult, totalQuestions]);

  const timerPercent = useMemo(
    () => Math.max(Math.min((timeLeft / QUESTION_TIME) * 100, 100), 0),
    [timeLeft],
  );

  const correctPercentage = useMemo(
    () => Math.round((score / TOTAL_QUESTIONS) * 100),
    [score],
  );

  const resultMessage = useMemo(
    () => evaluateResultMessage(score, TOTAL_QUESTIONS),
    [score],
  );

  return {
    gameStatus,
    currentQuestion,
    currentQuestionIndex,
    score,
    inputText,
    timeLeft,
    choices,
    showResult,
    isLoading,
    error,
    totalQuestions,
    progressPercent,
    timerPercent,
    correctPercentage,
    resultMessage,
    currentAnswer,
    selectedDifficulty,
    configuredTotalQuestions: TOTAL_QUESTIONS,
    startGame,
    goToStart,
    handleChoiceClick,
  };
};
