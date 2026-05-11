import { useState, useEffect, useRef, useCallback } from 'react';

const DHIKR_STAGES = [
  { arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', meaning: 'Glory be to Allah', total: 33 },
  { arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', meaning: 'All praise is due to Allah', total: 33 },
  { arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', meaning: 'Allah is the Greatest', total: 34 },
];

const TOTAL_COUNT = 33 + 33 + 34; // 100
const AUTO_INTERVAL_MS = 850; // ~85 seconds total for auto-pace
const SKIP_DELAY_MS = 10000; // 10 seconds before skip is allowed

export default function DhikrOverlay({ isActive, onComplete, streamProgress = 0, isStreamDone = false }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [isAutoPacing, setIsAutoPacing] = useState(true);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [exiting, setExiting] = useState(false);

  const autoTimerRef = useRef(null);
  const skipTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Reset state when overlay activates
  useEffect(() => {
    if (isActive) {
      setStageIndex(0);
      setCount(0);
      setCompleted(false);
      setCanSkip(false);
      setIsAutoPacing(true);
      setElapsedTotal(0);
      setExiting(false);
      startTimeRef.current = Date.now();

      // Enable skip after delay
      skipTimerRef.current = setTimeout(() => setCanSkip(true), SKIP_DELAY_MS);
    }
    return () => {
      clearTimeout(skipTimerRef.current);
      clearInterval(autoTimerRef.current);
    };
  }, [isActive]);

  // Advance to next count
  const advanceCount = useCallback(() => {
    setCount(prev => {
      const stage = DHIKR_STAGES[stageIndex];
      const next = prev + 1;

      if (next >= stage.total) {
        // Move to next stage
        if (stageIndex < DHIKR_STAGES.length - 1) {
          setStageIndex(si => si + 1);
          return 0; // Reset count for new stage
        } else {
          // All stages complete
          setCompleted(true);
          clearInterval(autoTimerRef.current);
          return prev;
        }
      }
      return next;
    });
    setElapsedTotal(prev => prev + 1);
  }, [stageIndex]);

  // Auto-pacing timer
  useEffect(() => {
    if (isActive && isAutoPacing && !completed) {
      autoTimerRef.current = setInterval(advanceCount, AUTO_INTERVAL_MS);
    }
    return () => clearInterval(autoTimerRef.current);
  }, [isActive, isAutoPacing, completed, advanceCount]);

  // Handle tap/click to manually advance
  function handleTap() {
    if (completed) return;
    // If auto-pacing, switch to manual
    if (isAutoPacing) {
      setIsAutoPacing(false);
      clearInterval(autoTimerRef.current);
    }
    advanceCount();
  }

  // Handle completion dismiss
  function handleDone() {
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  }

  // Handle skip
  function handleSkip() {
    if (!canSkip) return;
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  }

  if (!isActive) return null;

  const stage = DHIKR_STAGES[stageIndex];
  const overallProgress = (elapsedTotal / TOTAL_COUNT) * 100;
  const stageProgress = ((count + 1) / stage.total) * 100;

  return (
    <div className={`dhikr-backdrop ${exiting ? 'dhikr-backdrop--exit' : ''}`}>
      <div className={`dhikr-modal ${exiting ? 'dhikr-modal--exit' : ''}`}>

        {/* Header ornament */}
        <div className="dhikr-modal__ornament">✦ ☽ ✦</div>

        {!completed ? (
          <>
            {/* Intro text */}
            <p className="dhikr-modal__intro">Take a short pause. Recite with focus.</p>

            {/* Stage indicator pills */}
            <div className="dhikr-modal__stages">
              {DHIKR_STAGES.map((s, i) => (
                <div
                  key={i}
                  className={`dhikr-stage-pill ${
                    i < stageIndex ? 'dhikr-stage-pill--done' :
                    i === stageIndex ? 'dhikr-stage-pill--active' : ''
                  }`}
                >
                  {i < stageIndex ? '✓' : (i + 1)}
                </div>
              ))}
            </div>

            {/* Main dhikr display */}
            <div className="dhikr-modal__content" onClick={handleTap}>
              <div className="dhikr-modal__arabic" key={`${stageIndex}-${count}`}>
                {stage.arabic}
              </div>
              <div className="dhikr-modal__transliteration">
                {stage.transliteration}
              </div>
              <div className="dhikr-modal__meaning">
                {stage.meaning}
              </div>

              {/* Counter */}
              <div className="dhikr-modal__counter">
                <span className="dhikr-modal__count-current">{count + 1}</span>
                <span className="dhikr-modal__count-sep">/</span>
                <span className="dhikr-modal__count-total">{stage.total}</span>
              </div>

              {/* Stage progress ring */}
              <div className="dhikr-modal__ring-wrap">
                <svg className="dhikr-modal__ring" viewBox="0 0 120 120">
                  <circle className="dhikr-ring__track" cx="60" cy="60" r="54" />
                  <circle
                    className="dhikr-ring__fill"
                    cx="60" cy="60" r="54"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 54}`,
                      strokeDashoffset: `${2 * Math.PI * 54 * (1 - stageProgress / 100)}`,
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Tap hint */}
            <p className="dhikr-modal__hint">
              {isAutoPacing ? 'Tap anywhere to recite manually' : 'Tap to advance'}
            </p>

            {/* Overall progress bar */}
            <div className="dhikr-modal__progress">
              <div
                className="dhikr-modal__progress-fill"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Script generation status hint */}
            {streamProgress > 0 && (
              <div className="dhikr-modal__stream-hint">
                {isStreamDone ? (
                  <span className="dhikr-stream-hint--done">✓ Script ready</span>
                ) : (
                  <span className="dhikr-stream-hint--active">
                    <span className="dhikr-stream-dot" />
                    Crafting your script…
                  </span>
                )}
              </div>
            )}

            {/* Skip button */}
            {canSkip && (
              <button className="dhikr-modal__skip" onClick={handleSkip}>
                Skip →
              </button>
            )}
          </>
        ) : (
          /* Completion state */
          <div className="dhikr-modal__complete">
            <div className="dhikr-modal__complete-icon">
              <svg viewBox="0 0 64 64" className="dhikr-checkmark">
                <circle className="dhikr-checkmark__circle" cx="32" cy="32" r="28" />
                <path className="dhikr-checkmark__tick" d="M20 33 L28 41 L44 25" />
              </svg>
            </div>
            <p className="dhikr-modal__complete-arabic">جَزَاكَ اللَّهُ خَيْرًا</p>
            <h3 className="dhikr-modal__complete-title">Dhikr Completed</h3>
            <p className="dhikr-modal__complete-subtitle">Your script is ready.</p>
            <button className="dhikr-modal__reveal-btn" onClick={handleDone}>
              ✦ Reveal Script ✦
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
