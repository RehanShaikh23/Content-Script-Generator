import OptionButton from './OptionButton';

export default function OptionGrid({ options, columns, activeValue, onChange }) {
  return (
    <div className={`option-grid--${columns}`}>
      {options.map((opt) => (
        <OptionButton
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          sublabel={opt.sublabel}
          active={activeValue === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}
