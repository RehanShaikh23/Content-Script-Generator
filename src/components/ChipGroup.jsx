export default function ChipGroup({ options, activeValue, onChange }) {
  return (
    <div className="chip-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`chip${activeValue === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
