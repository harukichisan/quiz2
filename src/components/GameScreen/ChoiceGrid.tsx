type ChoiceGridProps = {
  choices: string[];
  onSelect: (choice: string) => void;
  disabled?: boolean;
};

const ChoiceGrid = ({ choices, onSelect, disabled = false }: ChoiceGridProps) => (
  <section className="choice-grid" aria-label="選択肢">
    {choices.map((char, index) => (
      <button
        key={`${char}-${index}`}
        type="button"
        className="choice-button"
        onClick={() => onSelect(char)}
        disabled={disabled}
      >
        {char}
      </button>
    ))}
  </section>
);

export default ChoiceGrid;

