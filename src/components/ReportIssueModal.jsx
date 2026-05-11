import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';

const SUBJECTS = ['Bug', 'Feature Request', 'Content Issue', 'Other'];
const MAX_DESC = 2000;

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  let browser = 'Unknown Browser';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';

  return `${browser} on ${os}`;
}

export default function ReportIssueModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleScreenshot(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1MB
    if (file.size > 1024 * 1024) {
      setError('Screenshot must be under 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result);
    reader.readAsDataURL(file);
  }

  function removeScreenshot() {
    setScreenshot(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    if (description.length > MAX_DESC) {
      setError(`Description must be ${MAX_DESC} characters or less.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/report', {
        subject,
        description: description.trim(),
        screenshotUrl: screenshot || null,
        deviceInfo: getDeviceInfo(),
      }, token);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    // Reset state on close
    setSubject(SUBJECTS[0]);
    setDescription('');
    setScreenshot(null);
    setError('');
    setSuccess(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="report-backdrop" onClick={handleClose} />
      <div className="report-modal">
        <button className="report-modal__close" onClick={handleClose} title="Close">
          ✕
        </button>

        {success ? (
          /* ── Success State ── */
          <div className="report-modal__success">
            <div className="report-modal__success-icon">
              <svg className="report-checkmark" viewBox="0 0 52 52">
                <circle className="report-checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path className="report-checkmark__tick" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 className="report-modal__success-title">Report Submitted</h3>
            <p className="report-modal__success-text">
              JazakAllah Khair. We'll review your report and take action soon, In Sha Allah.
            </p>
            <button className="generate-btn report-modal__submit-btn" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div className="report-modal__header">
              <span className="report-modal__ornament">✦ ☽ ✦</span>
              <h2 className="report-modal__title">Report an Issue</h2>
              <p className="report-modal__subtitle">
                Help us improve — report bugs, suggest features, or flag content issues.
              </p>
            </div>

            {error && (
              <div className="report-modal__error">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="report-modal__form">
              {/* Subject */}
              <div className="field">
                <label className="field__label" htmlFor="report-subject">Subject</label>
                <select
                  id="report-subject"
                  className="report-modal__select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="field">
                <label className="field__label" htmlFor="report-desc">
                  Description <span className="field__label-hint">(required)</span>
                </label>
                <textarea
                  id="report-desc"
                  rows="5"
                  maxLength={MAX_DESC}
                  placeholder="Describe the issue, steps to reproduce, or your suggestion…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="report-modal__char-count">
                  {description.length} / {MAX_DESC}
                </div>
              </div>

              {/* Screenshot */}
              <div className="field">
                <label className="field__label">
                  Screenshot <span className="field__label-hint">(optional, max 1 MB)</span>
                </label>
                {screenshot ? (
                  <div className="report-modal__screenshot-preview">
                    <img src={screenshot} alt="Screenshot preview" />
                    <button
                      type="button"
                      className="report-modal__screenshot-remove"
                      onClick={removeScreenshot}
                      title="Remove screenshot"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="report-modal__upload-area" htmlFor="report-screenshot">
                    <span className="report-modal__upload-icon">📎</span>
                    <span className="report-modal__upload-text">Click to attach a screenshot</span>
                    <input
                      type="file"
                      id="report-screenshot"
                      accept="image/*"
                      onChange={handleScreenshot}
                      hidden
                    />
                  </label>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="generate-btn report-modal__submit-btn"
                disabled={submitting || !description.trim()}
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
