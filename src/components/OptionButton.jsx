export default function OptionButton({ icon, label, sublabel, active, onClick }) {
  return (
    <button
      className={`option-btn${active ? ' active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="option-btn__icon">{icon}</span>
      <strong>{label}</strong>
      {sublabel && <div className="option-btn__sublabel">{sublabel}</div>}
    </button>
  );
}
