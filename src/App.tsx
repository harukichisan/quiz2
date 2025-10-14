import { useState, useEffect } from 'react';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import StartScreen from './components/StartScreen';
import BattleModeController from './components/BattleMode/BattleModeController';
import { useQuizGame } from './hooks/useQuizGame';
import { getSupabaseClient } from './lib/supabase';

type AppMode = 'select' | 'single' | 'battle';

const App = () => {
  const [appMode, setAppMode] = useState<AppMode>('select');
  const [userId, setUserId] = useState<string>('');

  const {
    gameStatus,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    score,
    inputText,
    timeLeft,
    choices,
    showResult,
    isLoading,
    error,
    progressPercent,
    timerPercent,
    correctPercentage,
    resultMessage,
    currentAnswer,
    selectedDifficulty,
    configuredTotalQuestions,
    startGame,
    goToStart,
    handleChoiceClick,
  } = useQuizGame();

  // Initialize anonymous auth for battle mode
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
        } else {
          // Sign in anonymously
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          if (data.user) {
            setUserId(data.user.id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      }
    };

    initAuth();
  }, []);

  // Mode selection screen
  if (appMode === 'select') {
    return (
      <div className="app-shell">
        <div className="surface surface--start">
          <h1 className="title">クイズモード選択</h1>
          <div className="mode-selector">
            <button
              type="button"
              className="mode-button"
              onClick={() => setAppMode('single')}
            >
              <span className="mode-button__icon">📝</span>
              <div className="mode-button__content">
                <h2 className="mode-button__title">シングルプレイ</h2>
                <p className="mode-button__description">
                  一人で練習できるモードです
                </p>
              </div>
            </button>

            <button
              type="button"
              className="mode-button"
              onClick={() => setAppMode('battle')}
            >
              <span className="mode-button__icon">⚔️</span>
              <div className="mode-button__content">
                <h2 className="mode-button__title">対戦モード</h2>
                <p className="mode-button__description">
                  友達と対戦できるモードです
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Battle mode
  if (appMode === 'battle') {
    return (
      <BattleModeController
        userId={userId}
        onBackToHome={() => setAppMode('select')}
      />
    );
  }

  // Single player mode (existing logic)
  if (gameStatus === 'start') {
    return (
      <div className="app-shell">
        <StartScreen
          isLoading={isLoading}
          error={error}
          selectedDifficulty={selectedDifficulty}
          onStart={(difficulty) => {
            void startGame(difficulty);
          }}
        />
        <button
          type="button"
          className="button button--secondary"
          onClick={() => setAppMode('select')}
          style={{ marginTop: '1rem' }}
        >
          モード選択に戻る
        </button>
      </div>
    );
  }

  if (gameStatus === 'finished') {
    return (
      <div className="app-shell">
        <ResultScreen
          score={score}
          totalQuestions={configuredTotalQuestions}
          percentage={correctPercentage}
          message={resultMessage}
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            void startGame();
          }}
          onChangeDifficulty={goToStart}
        />
        <button
          type="button"
          className="button button--secondary"
          onClick={() => setAppMode('select')}
          style={{ marginTop: '1rem' }}
        >
          モード選択に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <GameScreen
        question={currentQuestion}
        questionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        score={score}
        timeLeft={timeLeft}
        timerPercent={timerPercent}
        progressPercent={progressPercent}
        inputText={inputText}
        choices={choices}
        showResult={showResult}
        currentAnswer={currentAnswer}
        error={error}
        onChoiceSelect={handleChoiceClick}
      />
    </div>
  );
};

export default App;
