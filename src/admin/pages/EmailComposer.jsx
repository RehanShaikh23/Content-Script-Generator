import { useState } from 'react';
import { draftEmail, sendEmail, getUsers } from '../adminApi';

const TONES = ['Professional', 'Friendly', 'Urgent', 'Encouraging', 'Apologetic'];

export default function EmailComposer({ prefillUser }) {
  const [recipientEmail, setRecipientEmail] = useState(prefillUser?.email || '');
  const [recipientName, setRecipientName] = useState(prefillUser?.fullName || '');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);

  // User search suggestions
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function searchRecipient(query) {
    if (query.length < 2) { setUserSuggestions([]); return; }
    try {
      const data = await getUsers(0, 5, query);
      setUserSuggestions(data.users || []);
      setShowSuggestions(true);
    } catch { setUserSuggestions([]); }
  }

  function selectRecipient(user) {
    setRecipientEmail(user.email);
    setRecipientName(user.fullName);
    setShowSuggestions(false);
    setUserSuggestions([]);
  }

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const data = await draftEmail(recipientName, recipientEmail, context, tone);
      const raw = data.draft || '';

      // Parse SUBJECT: line and body
      const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i);
      const dividerIndex = raw.indexOf('---');

      if (subjectMatch) {
        setSubject(subjectMatch[1].trim());
      } else {
        setSubject('Email from Islamic Script Generator');
      }

      if (dividerIndex > -1) {
        setBody(raw.substring(dividerIndex + 3).trim());
      } else {
        // Remove the subject line from the body
        setBody(raw.replace(/SUBJECT:.+\n*/i, '').trim());
      }

      setHasDraft(true);
      setSent(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!recipientEmail || !subject || !body) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setSending(true);
    try {
      await sendEmail(recipientEmail, recipientName, subject, body);
      setSent(true);
      setAlert({ type: 'success', message: `Email sent successfully to ${recipientEmail}` });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setSubject('');
    setBody('');
    setHasDraft(false);
    setSent(false);
    setContext('');
    setError('');
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-header__title">Email Composer</h1>
        <p className="admin-page-header__subtitle">Draft and send AI-powered emails to your users</p>
      </div>

      {alert && (
        <div className={`admin-alert admin-alert--${alert.type}`}>
          {alert.type === 'success' ? '✓' : '⚠'} {alert.message}
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert--error">⚠ {error}</div>
      )}

      <div className="admin-composer">
        {/* Left: Compose Form */}
        <div className="admin-composer__form">
          <div className="admin-composer__section-title">
            ✏️ Compose
          </div>

          {/* Recipient */}
          <div className="admin-field" style={{ position: 'relative' }}>
            <label className="admin-field__label">Recipient</label>
            <input
              type="text"
              className="admin-field__input"
              placeholder="Search user or type email..."
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                searchRecipient(e.target.value);
              }}
              onFocus={() => userSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {/* Suggestions Dropdown */}
            {showSuggestions && userSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border-2)',
                borderRadius: 'var(--admin-radius-sm)', marginTop: '0.25rem',
                boxShadow: 'var(--admin-shadow)', maxHeight: '200px', overflowY: 'auto',
              }}>
                {userSuggestions.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      padding: '0.6rem 0.9rem', cursor: 'pointer',
                      borderBottom: '1px solid var(--admin-border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseDown={() => selectRecipient(u)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-surface-3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                      {u.fullName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-sec)' }}>
                      {u.email} · <span className={`admin-badge admin-badge--${u.subscriptionTier}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{u.subscriptionTier}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recipientName && recipientEmail && (
            <div style={{
              fontSize: '0.75rem', color: 'var(--admin-text-sec)',
              marginTop: '-0.6rem', marginBottom: '0.8rem',
              padding: '0.3rem 0.6rem', background: 'var(--admin-surface-2)',
              borderRadius: 'var(--admin-radius-sm)', display: 'inline-block',
            }}>
              To: <strong style={{ color: 'var(--admin-text)' }}>{recipientName}</strong>
            </div>
          )}

          {/* Context */}
          <div className="admin-field">
            <label className="admin-field__label">Purpose / Context</label>
            <textarea
              className="admin-field__textarea"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Welcome email for new signup, upgrade reminder, feature announcement..."
              rows={4}
            />
          </div>

          {/* Tone */}
          <div className="admin-field">
            <label className="admin-field__label">Tone</label>
            <div className="admin-tone-chips">
              {TONES.map((t) => (
                <button
                  key={t}
                  className={`admin-tone-chip ${tone === t ? 'admin-tone-chip--active' : ''}`}
                  onClick={() => setTone(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="admin-btn admin-btn--primary admin-btn--full"
            onClick={handleGenerate}
            disabled={generating || !context.trim() || !recipientEmail.trim()}
          >
            {generating ? (
              <>
                <div className="admin-spinner" />
                <span className="admin-shimmer">Generating with Gemini...</span>
              </>
            ) : (
              '✦ Generate with AI'
            )}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="admin-composer__preview">
          <div className="admin-composer__section-title">
            👁️ Preview
          </div>

          {sent ? (
            <div className="admin-sent-success">
              <div className="admin-sent-success__icon">✅</div>
              <div className="admin-sent-success__text">Email Sent!</div>
              <div className="admin-sent-success__detail">
                Delivered to {recipientEmail}
              </div>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={handleReset}
                style={{ marginTop: '1.5rem' }}
              >
                Compose Another
              </button>
            </div>
          ) : !hasDraft ? (
            <div className="admin-preview__empty">
              <div className="admin-preview__empty-icon">✉</div>
              <div className="admin-preview__empty-text">
                {generating ? 'AI is crafting your email...' : 'Your AI-generated email will appear here'}
              </div>
              <div className="admin-preview__empty-hint">
                Fill in the details and click "Generate with AI"
              </div>
              {generating && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="admin-spinner" style={{ margin: '0 auto' }} />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Subject */}
              <div className="admin-preview__subject">
                <div className="admin-preview__subject-label">Subject</div>
                <input
                  type="text"
                  className="admin-field__input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ marginTop: '0.3rem' }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '0.4rem' }}>
                <span className="admin-field__label">Email Body (editable)</span>
              </div>
              <textarea
                className="admin-preview__body-edit"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
              />

              {/* Actions */}
              <div className="admin-preview__actions">
                <button
                  className="admin-btn admin-btn--success"
                  onClick={handleSend}
                  disabled={sending || !subject || !body}
                  style={{ flex: 1 }}
                >
                  {sending ? (
                    <><div className="admin-spinner" style={{ borderTopColor: '#fff' }} /> Sending...</>
                  ) : (
                    '📨 Send Email'
                  )}
                </button>
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={handleGenerate}
                  disabled={generating}
                  title="Regenerate"
                >
                  🔄 Regenerate
                </button>
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={handleReset}
                  title="Clear"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
