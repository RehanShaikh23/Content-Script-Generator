import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';

const PLANS = {
  standard: {
    name: 'Standard',
    price: '$5/month',
    benefits: [
      'Up to 50 AI-generated scripts per month',
      'YouTube Shorts & Reels formats',
      'Access to 5 tone presets',
      'Basic script history (30 days)',
      'Standard AI model',
    ],
  },
  premium: {
    name: 'Premium',
    price: '$15/month',
    benefits: [
      'Unlimited AI-generated scripts',
      'All video formats (Shorts, Reels, Long-form)',
      'All tone presets + custom tones',
      'Unlimited script history',
      'Advanced AI with higher accuracy',
      'Priority generation speed',
      'Export scripts as PDF / DOCX',
      'Personal Creator Tips from Muslim Empire',
    ],
  },
};

const CANCELLATION_REASONS = [
  { value: '', label: 'Select a reason (optional)' },
  { value: 'too_expensive', label: 'Too expensive for my needs' },
  { value: 'not_using_enough', label: 'Not using it enough' },
  { value: 'found_alternative', label: 'Found an alternative tool' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'quality_issues', label: 'Quality didn\'t meet expectations' },
  { value: 'temporary_break', label: 'Taking a temporary break' },
  { value: 'other', label: 'Other reason' },
];

/**
 * CancelSubscriptionModal — Multi-step cancellation flow.
 *
 * Step 1: Confirmation — shows what user loses, access end date, reason dropdown
 * Step 2: Processing — shimmer loading state
 * Step 3: Success — animated checkmark + cancellation details
 */
export default function CancelSubscriptionModal({ isOpen, onClose }) {
  const {
    token, subscriptionTier, accessEndDate,
    updateSubscription, refreshSubscription
  } = useAuth();

  const [step, setStep] = useState('confirm'); // 'confirm' | 'processing' | 'success' | 'error'
  const [reason, setReason] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);
  const modalRef = useRef(null);
  const keepBtnRef = useRef(null);

  const plan = PLANS[subscriptionTier] || PLANS.standard;

  // Format the access end date for display
  const formattedEndDate = accessEndDate
    ? new Date(accessEndDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('confirm');
      setReason('');
      setAdditionalFeedback('');
      setError('');
      setResultData(null);
    }
  }, [isOpen]);

  // Focus the "Keep" button on open
  useEffect(() => {
    if (isOpen && step === 'confirm' && keepBtnRef.current) {
      keepBtnRef.current.focus();
    }
  }, [isOpen, step]);

  // Keyboard handling
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (step !== 'processing') onClose();
    }
  }, [onClose, step]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Handle cancellation
  async function handleConfirmCancel() {
    setStep('processing');
    setError('');

    try {
      const reasonText = reason === 'other'
        ? additionalFeedback || 'Other'
        : CANCELLATION_REASONS.find(r => r.value === reason)?.label || reason;

      const result = await apiPost('/subscription/cancel', {
        reason: reasonText,
      }, token);

      if (result.success) {
        // Update local state immediately
        updateSubscription(
          result.tier,
          result.status || 'CANCELLATION_SCHEDULED',
          result.credits,
          result.accessEndDate,
          new Date().toISOString()
        );

        // Also refresh from server
        await refreshSubscription();

        setResultData({
          accessEndDate: result.accessEndDate,
          tier: result.tier,
        });
        setStep('success');
      } else {
        setError(result.error || 'Failed to cancel subscription. Please try again.');
        setStep('error');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.message || 'Failed to cancel subscription. Please try again or contact support.');
      setStep('error');
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="cancel-backdrop" onClick={step !== 'processing' ? onClose : undefined} />
      <div
        className="cancel-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
      >
        {step !== 'processing' && (
          <button className="cancel-modal__close" onClick={onClose} title="Close">
            ✕
          </button>
        )}

        {/* ─── Step 1: Confirmation ─── */}
        {step === 'confirm' && (
          <div className="cancel-modal__content">
            <div className="cancel-modal__header">
              <span className="cancel-modal__ornament">✦ ☽ ✦</span>
              <h2 className="cancel-modal__title" id="cancel-title">
                Cancel Subscription?
              </h2>
              <p className="cancel-modal__subtitle">
                We're sorry to see you go. Here's what happens when you cancel.
              </p>
            </div>

            {/* What you'll lose */}
            <div className="cancel-modal__warning">
              <p className="cancel-modal__warning-title">
                ⚠ You'll lose access to:
              </p>
              <ul className="cancel-modal__loss-list">
                {plan.benefits.map((benefit, i) => (
                  <li key={i} className="cancel-modal__loss-item">
                    <span className="cancel-modal__loss-x">✕</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Access end info */}
            {formattedEndDate && (
              <div className="cancel-modal__end-date-box">
                <p className="cancel-modal__end-date-label">Your access continues until</p>
                <p className="cancel-modal__end-date-value">{formattedEndDate}</p>
                <p className="cancel-modal__end-date-note">
                  After this date, you'll be downgraded to the free plan (10 credits/month).
                </p>
              </div>
            )}

            {/* Reason dropdown */}
            <div className="cancel-modal__reason-section">
              <label className="cancel-modal__reason-label">
                Why are you cancelling?
              </label>
              <select
                className="cancel-modal__reason-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {reason === 'other' && (
                <textarea
                  className="cancel-modal__feedback"
                  placeholder="Tell us more (optional)…"
                  value={additionalFeedback}
                  onChange={(e) => setAdditionalFeedback(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              )}
            </div>

            {/* Actions */}
            <div className="cancel-modal__actions">
              <button
                ref={keepBtnRef}
                className="cancel-modal__btn cancel-modal__btn--keep"
                onClick={onClose}
              >
                ✦ Keep My Subscription
              </button>
              <button
                className="cancel-modal__btn cancel-modal__btn--danger"
                onClick={handleConfirmCancel}
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Processing ─── */}
        {step === 'processing' && (
          <div className="cancel-modal__content cancel-modal__processing">
            <div className="ai-loading">
              <div className="ai-loading__dots">
                <span /><span /><span />
              </div>
              <p className="ai-loading__text">Cancelling your subscription…</p>
            </div>
          </div>
        )}

        {/* ─── Step 3: Success ─── */}
        {step === 'success' && (
          <div className="cancel-modal__content cancel-modal__success-content">
            {/* Animated checkmark */}
            <div className="cancel-modal__icon-wrap">
              <svg className="cancel-modal__checkmark" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
                <circle className="cancel-modal__circle" cx="26" cy="26" r="24" fill="none" />
                <path className="cancel-modal__tick" fill="none" d="M14 27l7 7 16-16" />
              </svg>
            </div>

            <h2 className="cancel-modal__title">Cancellation Scheduled</h2>
            <p className="cancel-modal__subtitle">
              Your subscription has been cancelled. You'll continue to have full access until the end of your billing cycle.
            </p>

            {resultData?.accessEndDate && (
              <div className="cancel-modal__end-date-box">
                <p className="cancel-modal__end-date-label">Access ends on</p>
                <p className="cancel-modal__end-date-value">
                  {new Date(resultData.accessEndDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                <p className="cancel-modal__end-date-note">
                  💡 You can reactivate anytime before this date from your account.
                </p>
              </div>
            )}

            <div className="cancel-modal__actions">
              <button
                className="cancel-modal__btn cancel-modal__btn--keep"
                onClick={onClose}
              >
                ✦ Done
              </button>
            </div>
          </div>
        )}

        {/* ─── Error State ─── */}
        {step === 'error' && (
          <div className="cancel-modal__content">
            <div className="cancel-modal__header">
              <h2 className="cancel-modal__title" id="cancel-title">
                Something Went Wrong
              </h2>
            </div>
            <div className="cancel-modal__error-box">
              ⚠️ {error}
            </div>
            <div className="cancel-modal__actions">
              <button
                className="cancel-modal__btn cancel-modal__btn--keep"
                onClick={() => setStep('confirm')}
              >
                Try Again
              </button>
              <button
                className="cancel-modal__btn cancel-modal__btn--danger"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
