import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet, apiDelete } from '../api';
import { CATEGORIES, TONES } from '../constants';

// ── Platform options for calendar ──
const CALENDAR_PLATFORMS = [
  { value: 'shorts', label: 'YouTube Shorts', icon: '⚡' },
  { value: 'reels', label: 'Reels / TikTok', icon: '📱' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '7 Days', sublabel: '1 Week' },
  { value: 14, label: '14 Days', sublabel: '2 Weeks' },
  { value: 30, label: '30 Days', sublabel: '1 Month' },
];

const CATEGORY_OPTIONS = [
  { value: 'auto_mix', label: 'Auto Mix ✦', sublabel: 'Smart variety' },
  ...CATEGORIES.map(c => ({ value: c.value, label: c.label })),
];

const TONE_OPTIONS = TONES.filter(t => !t.premium).map(t => ({ value: t.value, label: t.label }));

export default function ContentCalendarPlanner() {
  const { token, isPremium, subscriptionTier, subscriptionStatus, updateCredits, credits } = useAuth();

  const isSubscriber = (subscriptionTier === 'standard' || subscriptionTier === 'premium')
    && subscriptionStatus === 'ACTIVE';

  // ── Setup state ──
  const [view, setView] = useState('setup'); // 'setup' | 'generating' | 'calendar' | 'calendars'
  const [duration, setDuration] = useState(7);
  const [category, setCategory] = useState('auto_mix');
  const [tone, setTone] = useState('educational');
  const [platform, setPlatform] = useState('shorts');
  const [error, setError] = useState('');

  // ── Calendar state ──
  const [calendarId, setCalendarId] = useState(null);
  const [calendarName, setCalendarName] = useState('');
  const [days, setDays] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [regeneratingDay, setRegeneratingDay] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // ── Saved calendars ──
  const [savedCalendars, setSavedCalendars] = useState([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // ── Generation progress ──
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('');
  const genInterval = useRef(null);

  const GEN_MESSAGES = [
    'Planning your content strategy…',
    'Selecting diverse Islamic topics…',
    'Crafting engaging scripts…',
    'Balancing emotional tones…',
    'Adding Quranic references…',
    'Generating captions & hashtags…',
    'Optimizing posting schedule…',
    'Finalizing your calendar…',
  ];

  // Get user timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Credit cost
  const creditCost = Math.ceil(duration / 7);

  // Today's date for highlighting
  const today = new Date().toISOString().split('T')[0];

  // ── Generate Calendar ──
  const handleGenerate = useCallback(async () => {
    if (!isSubscriber) return;
    setError('');
    setView('generating');
    setGenProgress(0);
    setGenMessage(GEN_MESSAGES[0]);

    // Cycle messages
    let msgIdx = 0;
    genInterval.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % GEN_MESSAGES.length;
      setGenMessage(GEN_MESSAGES[msgIdx]);
      setGenProgress(prev => Math.min(prev + Math.random() * 12, 90));
    }, 2800);

    try {
      const result = await apiPost('/calendar/generate', {
        duration,
        category,
        tone,
        platform,
        timezone: userTimezone,
      }, token);

      clearInterval(genInterval.current);
      setGenProgress(100);

      setCalendarId(result.id);
      setCalendarName(result.name);
      setDays(result.days || []);
      if (result.remainingCredits !== undefined) {
        updateCredits(result.remainingCredits);
      }

      setTimeout(() => setView('calendar'), 400);
    } catch (err) {
      clearInterval(genInterval.current);
      setError(err.message || 'Failed to generate calendar');
      setView('setup');
    }
  }, [isSubscriber, duration, category, tone, platform, userTimezone, token, updateCredits]);

  // ── Load saved calendars ──
  const loadCalendars = useCallback(async () => {
    setLoadingCalendars(true);
    try {
      const data = await apiGet('/calendar', token);
      setSavedCalendars(data.calendars || []);
    } catch {
      setSavedCalendars([]);
    } finally {
      setLoadingCalendars(false);
    }
  }, [token]);

  // ── Load specific calendar ──
  const loadCalendar = useCallback(async (id) => {
    try {
      const data = await apiGet(`/calendar/${id}`, token);
      setCalendarId(data.id);
      setCalendarName(data.name);
      setDays(data.days || []);
      setView('calendar');
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
    }
  }, [token]);

  // ── Delete calendar ──
  const deleteCalendar = useCallback(async (id) => {
    try {
      await apiDelete(`/calendar/${id}`, token);
      setSavedCalendars(prev => prev.filter(c => c.id !== id));
    } catch {
      // silent
    }
  }, [token]);

  // ── Mark day as posted ──
  const togglePosted = useCallback(async (dayNumber) => {
    if (!calendarId) return;
    const day = days.find(d => d.dayNumber === dayNumber);
    if (!day) return;

    const newPosted = !day.isPosted;
    try {
      await apiPost(`/calendar/${calendarId}/day/${dayNumber}`, {
        dayNumber,
        isPosted: newPosted,
      }, token, 'PUT');

      setDays(prev => prev.map(d =>
        d.dayNumber === dayNumber ? { ...d, isPosted: newPosted } : d
      ));
    } catch {
      // silent
    }
  }, [calendarId, days, token]);

  // ── Regenerate day ──
  const handleRegenerateDay = useCallback(async (dayNumber) => {
    if (!calendarId) return;
    setRegeneratingDay(dayNumber);
    try {
      const result = await apiPost(`/calendar/${calendarId}/day/${dayNumber}/regenerate`, {}, token);
      setDays(result.days || []);
    } catch (err) {
      setError(err.message || 'Failed to regenerate');
    } finally {
      setRegeneratingDay(null);
    }
  }, [calendarId, token]);

  // ── Save edited day ──
  const handleSaveEdit = useCallback(async () => {
    if (!calendarId || !editingDay) return;
    try {
      await apiPost(`/calendar/${calendarId}/day/${editingDay}`, {
        dayNumber: editingDay,
        ...editForm,
      }, token, 'PUT');

      setDays(prev => prev.map(d =>
        d.dayNumber === editingDay ? { ...d, ...editForm } : d
      ));
      setEditingDay(null);
      setEditForm({});
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  }, [calendarId, editingDay, editForm, token]);

  // ── Copy text ──
  const handleCopy = useCallback((text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  }, []);

  // ── Download calendar ──
  const handleDownload = useCallback(async () => {
    if (!calendarId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:8082/api'}/calendar/${calendarId}/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${calendarName || 'calendar'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download calendar');
    }
  }, [calendarId, calendarName, token]);

  // ── Cleanup ──
  useEffect(() => {
    return () => clearInterval(genInterval.current);
  }, []);

  // ── Format date for display ──
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ═══════════════════════════════════════
  //  LOCKED STATE (non-subscribers)
  // ═══════════════════════════════════════
  if (!isSubscriber) {
    return (
      <div className="cal-locked">
        <div className="cal-locked__blur">
          <div className="cal-locked__grid">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="cal-locked__card">
                <div className="cal-locked__card-top" />
                <div className="cal-locked__card-line" />
                <div className="cal-locked__card-line cal-locked__card-line--short" />
              </div>
            ))}
          </div>
        </div>
        <div className="cal-locked__overlay">
          <div className="cal-locked__icon">📅</div>
          <h3 className="cal-locked__title">Content Calendar Planner</h3>
          <p className="cal-locked__text">
            Plan 7 to 30 days of Islamic content in advance. Auto-generated scripts, captions, hashtags & posting times.
          </p>
          <button
            className="cal-locked__btn"
            onClick={() => window.dispatchEvent(new Event('openPricingModal'))}
          >
            ✦ Upgrade to Unlock
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  GENERATING STATE
  // ═══════════════════════════════════════
  if (view === 'generating') {
    return (
      <div className="cal-generating">
        <div className="cal-generating__icon">📅</div>
        <h3 className="cal-generating__title">Generating Your Calendar</h3>
        <p className="cal-generating__subtitle">{duration} days of Islamic content</p>

        <div className="cal-generating__progress">
          <div className="cal-generating__progress-bar" style={{ width: `${genProgress}%` }} />
        </div>

        <p className="cal-generating__message" key={genMessage}>{genMessage}</p>

        <div className="ai-loading__dots" style={{ marginTop: '1rem' }}>
          <span /><span /><span />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  SAVED CALENDARS LIST
  // ═══════════════════════════════════════
  if (view === 'calendars') {
    return (
      <div className="cal-list">
        <div className="cal-list__header">
          <h3 className="cal-list__title">📅 My Calendars</h3>
          <button className="cal-list__back" onClick={() => setView('setup')}>← New Calendar</button>
        </div>

        {loadingCalendars ? (
          <div className="cal-list__loading">Loading calendars…</div>
        ) : savedCalendars.length === 0 ? (
          <div className="cal-list__empty">
            <div className="cal-list__empty-icon">📭</div>
            <p>No calendars yet</p>
            <p className="cal-list__empty-hint">Generate your first content calendar</p>
          </div>
        ) : (
          <div className="cal-list__items">
            {savedCalendars.map(cal => (
              <div key={cal.id} className="cal-list__item" onClick={() => loadCalendar(cal.id)}>
                <div className="cal-list__item-top">
                  <span className="cal-list__item-name">{cal.name}</span>
                  <button
                    className="cal-list__item-delete"
                    onClick={(e) => { e.stopPropagation(); deleteCalendar(cal.id); }}
                    title="Delete"
                  >🗑</button>
                </div>
                <div className="cal-list__item-meta">
                  <span className="cal-list__item-tag">{cal.duration} days</span>
                  <span className="cal-list__item-tag">{cal.platform}</span>
                  <span className="cal-list__item-progress">
                    {cal.postedDays}/{cal.totalDays} posted
                  </span>
                </div>
                <div className="cal-list__item-bar">
                  <div
                    className="cal-list__item-bar-fill"
                    style={{ width: `${(cal.postedDays / cal.totalDays) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  CALENDAR GRID VIEW
  // ═══════════════════════════════════════
  if (view === 'calendar' && days.length > 0) {
    const postedCount = days.filter(d => d.isPosted).length;
    const progressPct = (postedCount / days.length) * 100;

    return (
      <div className="cal-view">
        {/* Header */}
        <div className="cal-view__header">
          <div className="cal-view__header-left">
            <button className="cal-view__back" onClick={() => setView('setup')}>←</button>
            <div>
              <h3 className="cal-view__title">{calendarName}</h3>
              <span className="cal-view__subtitle">
                {postedCount}/{days.length} posted • {days.length - postedCount} remaining
              </span>
            </div>
          </div>
          <div className="cal-view__header-actions">
            <button className="cal-view__action-btn" onClick={handleDownload} title="Download">
              📥 Download
            </button>
            <button
              className="cal-view__action-btn"
              onClick={() => { loadCalendars(); setView('calendars'); }}
              title="My Calendars"
            >
              📂 My Calendars
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="cal-view__progress">
          <div className="cal-view__progress-bar" style={{ width: `${progressPct}%` }} />
        </div>

        {error && <div className="auth-error" style={{marginBottom: '1rem'}}>{error}</div>}

        {/* Grid */}
        <div className="cal-grid">
          {days.map(day => {
            const isToday = day.date === today;
            const isExpanded = expandedDay === day.dayNumber;

            return (
              <div
                key={day.dayNumber}
                className={`cal-card ${isToday ? 'cal-card--today' : ''} ${day.isPosted ? 'cal-card--posted' : ''} ${isExpanded ? 'cal-card--expanded' : ''}`}
                onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
              >
                {/* Card header */}
                <div className="cal-card__head">
                  <div className="cal-card__day-badge">
                    {isToday && <span className="cal-card__today-dot" />}
                    Day {day.dayNumber}
                  </div>
                  <span className="cal-card__date">{formatDate(day.date)}</span>
                </div>

                {/* Topic */}
                <h4 className="cal-card__topic">{day.topic}</h4>

                {/* Meta row */}
                <div className="cal-card__meta">
                  <span className="cal-card__category">{day.category}</span>
                  <span className="cal-card__time">🕐 {day.postingTime}</span>
                </div>

                {/* Status */}
                <div className="cal-card__status">
                  {day.isPosted ? (
                    <span className="cal-card__posted-badge">✓ Posted</span>
                  ) : isToday ? (
                    <span className="cal-card__today-badge">Today's Content</span>
                  ) : (
                    <span className="cal-card__pending-badge">Pending</span>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="cal-card__expanded" onClick={(e) => e.stopPropagation()}>
                    <div className="cal-card__divider" />

                    {/* Script */}
                    <div className="cal-card__section">
                      <div className="cal-card__section-head">
                        <span className="cal-card__section-label">Script</span>
                        <button
                          className="cal-card__copy-btn"
                          onClick={() => handleCopy(day.script, `script-${day.dayNumber}`)}
                        >
                          {copiedField === `script-${day.dayNumber}` ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                      <p className="cal-card__script">{day.script}</p>
                    </div>

                    {/* Caption */}
                    <div className="cal-card__section">
                      <div className="cal-card__section-head">
                        <span className="cal-card__section-label">Caption</span>
                        <button
                          className="cal-card__copy-btn"
                          onClick={() => handleCopy(day.caption, `caption-${day.dayNumber}`)}
                        >
                          {copiedField === `caption-${day.dayNumber}` ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                      <p className="cal-card__caption">{day.caption}</p>
                    </div>

                    {/* Hashtags */}
                    <div className="cal-card__section">
                      <span className="cal-card__section-label">Hashtags</span>
                      <div className="cal-card__hashtags">
                        {(day.hashtags || []).map((tag, i) => (
                          <span
                            key={i}
                            className="cal-card__hashtag"
                            onClick={() => handleCopy(tag, `hash-${day.dayNumber}-${i}`)}
                            title="Click to copy"
                          >
                            {tag}
                            {copiedField === `hash-${day.dayNumber}-${i}` && <span className="cal-card__hashtag-copied">✓</span>}
                          </span>
                        ))}
                        <button
                          className="cal-card__copy-btn"
                          onClick={() => handleCopy((day.hashtags || []).join(' '), `allhash-${day.dayNumber}`)}
                        >
                          {copiedField === `allhash-${day.dayNumber}` ? '✓ All Copied' : 'Copy All'}
                        </button>
                      </div>
                    </div>

                    {/* Emotional tone */}
                    {day.emotionalTone && (
                      <div className="cal-card__tone-pill">
                        ❤️ {day.emotionalTone}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="cal-card__actions">
                      <button
                        className="cal-card__action cal-card__action--posted"
                        onClick={() => togglePosted(day.dayNumber)}
                      >
                        {day.isPosted ? '↩ Unmark' : '✓ Mark Posted'}
                      </button>
                      <button
                        className="cal-card__action cal-card__action--regen"
                        onClick={() => handleRegenerateDay(day.dayNumber)}
                        disabled={regeneratingDay === day.dayNumber}
                      >
                        {regeneratingDay === day.dayNumber ? '⏳ Regenerating…' : '🔄 Regenerate'}
                      </button>
                      <button
                        className="cal-card__action cal-card__action--edit"
                        onClick={() => {
                          setEditingDay(day.dayNumber);
                          setEditForm({
                            topic: day.topic,
                            script: day.script,
                            caption: day.caption,
                            hashtags: day.hashtags,
                            postingTime: day.postingTime,
                          });
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="cal-view__footer">
          <button className="cal-view__new-btn" onClick={() => setView('setup')}>
            ✦ New Calendar
          </button>
        </div>

        {/* Edit Modal */}
        {editingDay && (
          <>
            <div className="cal-edit-backdrop" onClick={() => setEditingDay(null)} />
            <div className="cal-edit-modal">
              <button className="cal-edit-modal__close" onClick={() => setEditingDay(null)}>✕</button>
              <h3 className="cal-edit-modal__title">Edit Day {editingDay}</h3>

              <div className="field">
                <label className="field__label">Topic</label>
                <input
                  value={editForm.topic || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field__label">Script</label>
                <textarea
                  value={editForm.script || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, script: e.target.value }))}
                  style={{ minHeight: '120px' }}
                />
              </div>

              <div className="field">
                <label className="field__label">Caption</label>
                <textarea
                  value={editForm.caption || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field__label">Hashtags <span className="field__label-hint">(comma separated)</span></label>
                <input
                  value={(editForm.hashtags || []).join(', ')}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    hashtags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  }))}
                />
              </div>

              <div className="field">
                <label className="field__label">Posting Time</label>
                <input
                  value={editForm.postingTime || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, postingTime: e.target.value }))}
                />
              </div>

              <button className="generate-btn" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  SETUP VIEW (default)
  // ═══════════════════════════════════════
  return (
    <div className="cal-setup">
      <div className="cal-setup__header">
        <span className="cal-setup__ornament">✦ ☽ ✦</span>
        <h2 className="cal-setup__title">Content Calendar Planner</h2>
        <p className="cal-setup__subtitle">
          Plan your Islamic content in advance — just open, follow the plan, and post consistently
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Duration */}
      <div className="field">
        <label className="field__label">Calendar Duration</label>
        <div className="cal-setup__duration-grid">
          {DURATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`cal-setup__duration-btn ${duration === opt.value ? 'active' : ''}`}
              onClick={() => setDuration(opt.value)}
            >
              <span className="cal-setup__duration-value">{opt.label}</span>
              <span className="cal-setup__duration-sub">{opt.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="field">
        <label className="field__label">Content Category</label>
        <div className="chip-group">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`chip ${category === opt.value ? 'active' : ''}`}
              onClick={() => setCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="field">
        <label className="field__label">Content Tone</label>
        <div className="chip-group">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`chip ${tone === opt.value ? 'active' : ''}`}
              onClick={() => setTone(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div className="field">
        <label className="field__label">Target Platform</label>
        <div className="cal-setup__platform-grid">
          {CALENDAR_PLATFORMS.map(opt => (
            <button
              key={opt.value}
              className={`cal-setup__platform-btn ${platform === opt.value ? 'active' : ''}`}
              onClick={() => setPlatform(opt.value)}
            >
              <span className="cal-setup__platform-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Credit info */}
      <div className="cal-setup__credit-info">
        <span>Cost: <strong>{creditCost} credit{creditCost > 1 ? 's' : ''}</strong></span>
        <span className="cal-setup__credit-sep">•</span>
        <span>Available: <strong>{isPremium ? '∞' : credits}</strong></span>
      </div>

      {/* Generate button */}
      <div className="generate-btn-wrap">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!isPremium && credits < creditCost}
        >
          📅 Generate {duration}-Day Calendar
        </button>
      </div>

      {/* My Calendars link */}
      <button
        className="cal-setup__my-calendars"
        onClick={() => { loadCalendars(); setView('calendars'); }}
      >
        📂 View My Saved Calendars
      </button>
    </div>
  );
}
