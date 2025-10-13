import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import StartScreen from './components/StartScreen';
import { useQuizGame } from './hooks/useQuizGame';

const App = () => {
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
