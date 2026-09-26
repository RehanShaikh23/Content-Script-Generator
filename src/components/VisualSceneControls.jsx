import ChipGroup from './ChipGroup';
import {
  VISUAL_STYLES,
  VISUAL_ASPECT_RATIOS,
  VISUAL_DURATIONS,
  GENERATION_MODES,
} from '../constants';

/**
 * Visual Scene Agent settings panel.
 * Rendered after script generation completes.
 * Uses existing ChipGroup component for consistency.
 */
export default function VisualSceneControls({
  settings,
  onUpdateSetting,
  onGenerate,
  isProcessing,
  isProfileLoading,
  scenesCount,
}) {
  const canGenerate = scenesCount > 0 && !isProcessing;

  return (
    <div className="visual-controls">
      <div className="visual-controls__header">
        <h3 className="visual-controls__title">🎬 AI Visual Direction</h3>
        <p className="visual-controls__subtitle">
          Generate visual production plans for each scene in your script
        </p>
      </div>

      <div className="visual-controls__grid">
        {/* Visual Style */}
        <div className="field">
          <label className="field__label">
            Visual Style
          </label>
          <ChipGroup
            options={VISUAL_STYLES}
            activeValue={settings.visualStyle}
            onChange={(val) => onUpdateSetting('visualStyle', val)}
          />
        </div>

        {/* Aspect Ratio + Duration + Mode — compact row */}
        <div className="visual-controls__row">
          <div className="field visual-controls__field">
            <label className="field__label">Aspect Ratio</label>
            <ChipGroup
              options={VISUAL_ASPECT_RATIOS}
              activeValue={settings.aspectRatio}
              onChange={(val) => onUpdateSetting('aspectRatio', val)}
            />
          </div>

          <div className="field visual-controls__field">
            <label className="field__label">Duration</label>
            <ChipGroup
              options={VISUAL_DURATIONS}
              activeValue={settings.duration}
              onChange={(val) => onUpdateSetting('duration', val)}
            />
          </div>

          <div className="field visual-controls__field">
            <label className="field__label">Mode</label>
            <ChipGroup
              options={GENERATION_MODES}
              activeValue={settings.generationMode}
              onChange={(val) => onUpdateSetting('generationMode', val)}
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="visual-controls__actions">
        {isProcessing ? (
          <button className="visual-controls__btn visual-controls__btn--processing" disabled>
            <span className="visual-controls__spinner" />
            {isProfileLoading ? 'Building visual profile…' : 'Generating visual direction…'}
          </button>
        ) : (
          <button
            className="visual-controls__btn"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            🎬 Generate Visual Direction
            {scenesCount > 0 && (
              <span className="visual-controls__badge">{scenesCount} scenes</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
