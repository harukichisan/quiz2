type QuestionCardProps = {
  question?: string | null;
};

const QuestionCard = ({ question }: QuestionCardProps) => (
  <section className="question-card">
    <p className="question-text">{question ?? '---'}</p>
  </section>
);

export default QuestionCard;

