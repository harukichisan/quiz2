import ErrorNotice from '../ErrorNotice';
import type { Question, ResultStatus } from '../../hooks/useQuizGame';
import GameHeader from './GameHeader';
import QuestionCard from './QuestionCard';
import InputDisplay from './InputDisplay';
import ChoiceGrid from './ChoiceGrid';
import ResultBanner from './ResultBanner';

type GameScreenProps = {
  question: Question | null;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  timeLeft: number;
  timerPercent: number;
  progressPercent: number;
  inputText: string;
  choices: string[];
  showResult: ResultStatus;
  currentAnswer: string;
  error?: string | null;
  onChoiceSelect: (choice: string) => void;
};

const GameScreen = ({
  question,
  questionIndex,
  totalQuestions,
  score,
  timeLeft,
  timerPercent,
  progressPercent,
  inputText,
  choices,
  showResult,
  currentAnswer,
  error,
  onChoiceSelect,
}: GameScreenProps) => (
  <div className="surface surface--game">
    {error && <ErrorNotice message={error} />}
    <GameHeader
      currentQuestionNumber={questionIndex + 1}
      totalQuestions={totalQuestions}
      category={question?.category}
      difficulty={question?.difficulty ?? null}
      score={score}
      timeLeft={timeLeft}
      timerPercent={timerPercent}
      progressPercent={progressPercent}
    />
    <QuestionCard question={question?.question} />
    <InputDisplay value={inputText} />
    {showResult ? (
      <ResultBanner status={showResult} answer={currentAnswer} />
    ) : (
      <ChoiceGrid choices={choices} onSelect={onChoiceSelect} />
    )}
  </div>
);

export default GameScreen;
