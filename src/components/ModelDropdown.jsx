import { useState, useRef, useEffect } from 'react';

/**
 * Smooth animated dropdown for AI model selection.
 * Replaces the flat chip grid with a compact, elegant select.
 */
export default function ModelDropdown({ models, allModels, selected, onSelect, isPremium }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Find the full model object for the currently selected value
  const current = (allModels || models).find(m => m.value === selected) || models[0];

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleSelect(model) {
    onSelect(model.value);
    setOpen(false);
  }

  return (
    <div className={`model-dropdown${open ? ' model-dropdown--open' : ''}`} ref={wrapRef}>
      {/* Trigger */}
      <button
        type="button"
        className="model-dropdown__trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="model-dropdown__trigger-icon">{current.icon}</span>
        <span className="model-dropdown__trigger-info">
          <span className="model-dropdown__trigger-label">{current.label}</span>
          {current.sublabel && (
            <span className="model-dropdown__trigger-sublabel">{current.sublabel}</span>
          )}
        </span>
        <span className={`model-dropdown__chevron${open ? ' model-dropdown__chevron--up' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* Options panel */}
      <div className="model-dropdown__panel" role="listbox">
        {models.map((m) => (
          <button
            key={m.value}
            type="button"
            role="option"
            aria-selected={selected === m.value}
            className={`model-dropdown__option${selected === m.value ? ' model-dropdown__option--active' : ''}`}
            onClick={() => handleSelect(m)}
          >
            <span className="model-dropdown__option-icon">{m.icon}</span>
            <span className="model-dropdown__option-info">
              <span className="model-dropdown__option-label">{m.label}</span>
              {m.sublabel && (
                <span className="model-dropdown__option-sublabel">{m.sublabel}</span>
              )}
            </span>
            {selected === m.value && (
              <span className="model-dropdown__check">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        ))}

        {/* Locked models hint for free users */}
        {!isPremium && allModels.some(m => m.premium) && (
          <div className="model-dropdown__locked">
            {allModels.filter(m => m.premium).map(m => (
              <div key={m.value} className="model-dropdown__locked-item">
                <span className="model-dropdown__option-icon model-dropdown__option-icon--locked">{m.icon}</span>
                <span className="model-dropdown__option-info">
                  <span className="model-dropdown__option-label">{m.label}</span>
                  <span className="model-dropdown__option-sublabel">{m.sublabel}</span>
                </span>
                <span className="model-dropdown__lock-badge">PRO</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
