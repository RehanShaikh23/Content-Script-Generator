import { useState, useEffect, useCallback } from 'react';
import ISLAMIC_QUOTES from '../data/islamicQuotes';

const STORAGE_KEY = 'islamicAi_dailyReminder';

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a deterministic quote index for a given date
 * Uses a simple hash so the same date always shows the same quote
 */
function getQuoteIndexForDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % ISLAMIC_QUOTES.length;
}

/**
 * Check localStorage to see if today's quote has been shown
 */
function hasShownToday() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data.lastShownDate === getTodayDate();
  } catch {
    return false;
  }
}

/**
 * Mark today's quote as shown
 */
function markShownToday() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    data.lastShownDate = getTodayDate();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* silent */ }
}

/**
 * Check if daily reminder is disabled in settings
 */
function isReminderDisabled() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data.disabled === true;
  } catch {
    return false;
  }
}

export default function DailyReminderModal() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = getTodayDate();
  const quoteIndex = getQuoteIndexForDate(today);
  const quote = ISLAMIC_QUOTES[quoteIndex];

  useEffect(() => {
    if (!isReminderDisabled() && !hasShownToday()) {
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = useCallback(() => {
    setExiting(true);
    markShownToday();
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 400);
  }, []);

  const handleSaveQuote = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const savedQuotes = data.savedQuotes || [];
      const alreadySaved = savedQuotes.some(q => q.text === quote.text);
      if (!alreadySaved) {
        savedQuotes.push({ ...quote, savedOn: today });
        data.savedQuotes = savedQuotes;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
  }, [quote, today]);

  const handleGenerateScript = useCallback(() => {
    // Dispatch an event that ScriptForm can listen to (pre-fill topic)
    const event = new CustomEvent('prefillScriptTopic', {
      detail: { topic: quote.text, source: quote.source }
    });
    window.dispatchEvent(event);
    handleClose();
  }, [quote, handleClose]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`reminder-backdrop ${exiting ? 'reminder-backdrop--exit' : ''}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`reminder-modal ${exiting ? 'reminder-modal--exit' : ''}`}>
        {/* Close button */}
        <button className="reminder-modal__close" onClick={handleClose} title="Close">
          ✕
        </button>

        {/* Decorative top glow */}
        <div className="reminder-modal__glow" />

        {/* Ornament */}
        <div className="reminder-modal__ornament">✦ ☽ ✦</div>

        {/* Label */}
        <div className="reminder-modal__label">Daily Reminder</div>

        {/* Category tag */}
        <div className="reminder-modal__category">{quote.category}</div>

        {/* Arabic text */}
        {quote.arabic && (
          <div className="reminder-modal__arabic">{quote.arabic}</div>
        )}

        {/* English quote */}
        <blockquote className="reminder-modal__quote">
          "{quote.text}"
        </blockquote>

        {/* Source */}
        <div className="reminder-modal__source">— {quote.source}</div>

        {/* Decorative divider */}
        <div className="reminder-modal__divider">
          <span className="reminder-modal__divider-dot" />
          <span className="reminder-modal__divider-line" />
          <span className="reminder-modal__divider-dot" />
        </div>

        {/* Actions */}
        <div className="reminder-modal__actions">
          <button className="reminder-modal__btn reminder-modal__btn--generate" onClick={handleGenerateScript}>
            ✦ Generate Script
          </button>
          <button
            className={`reminder-modal__btn reminder-modal__btn--save ${saved ? 'reminder-modal__btn--saved' : ''}`}
            onClick={handleSaveQuote}
          >
            {saved ? '✓ Saved' : '♡ Save Quote'}
          </button>
        </div>

        {/* Close text */}
        <button className="reminder-modal__dismiss" onClick={handleClose}>
          Close & Continue
        </button>
      </div>
    </>
  );
}
