type InputDisplayProps = {
  value: string;
  placeholder?: string;
};

const InputDisplay = ({ value, placeholder = 'まだ入力していません' }: InputDisplayProps) => (
  <section className="input-card">
    <div className="input-label">現在の入力</div>
    <div className={`input-display ${value ? 'input-display--active' : ''}`}>
      {value ? value : <span className="input-placeholder">{placeholder}</span>}
    </div>
  </section>
);

export default InputDisplay;

