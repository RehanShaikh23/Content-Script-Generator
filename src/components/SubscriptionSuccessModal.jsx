import { useEffect, useRef, useCallback } from 'react';

/**
 * SubscriptionSuccessModal — Premium success confirmation dialog.
 * Replaces browser alert() with a polished, animated modal.
 *
 * Props:
 *   isOpen        – boolean controlling visibility
 *   onClose       – callback to dismiss the modal
 *   planName      – e.g. "Premium" or "Standard"
 *   subscriptionId – PayPal subscription ID
 *   nextBillingDate – optional ISO date string for next billing cycle
 */
export default function SubscriptionSuccessModal({
  isOpen,
  onClose,
  planName = 'Premium',
  subscriptionId = '',
  nextBillingDate = null,
}) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Format the next billing date
  const formattedDate = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Focus trap: keep focus inside the modal
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  // Auto-focus the Continue button when modal opens
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  // Attach keyboard listener
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Auto-close after 12 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 12000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="success-backdrop" />
      <div
        className="success-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        {/* Animated checkmark */}
        <div className="success-modal__icon-wrap">
          <svg
            className="success-modal__checkmark"
            viewBox="0 0 52 52"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="success-modal__circle"
              cx="26"
              cy="26"
              r="24"
              fill="none"
            />
            <path
              className="success-modal__tick"
              fill="none"
              d="M14 27l7 7 16-16"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="success-modal__title" id="success-title">
          Subscription Activated
        </h2>

        {/* Subtitle */}
        <p className="success-modal__subtitle">
          Jazakallah Khair! Your <strong>{planName}</strong> plan is now active.
          <br />
          You have full access to all {planName} features.
        </p>

        {/* Details */}
        <div className="success-modal__details">
          <div className="success-modal__detail-row">
            <span className="success-modal__detail-label">Plan</span>
            <span className="success-modal__detail-value">{planName}</span>
          </div>
          {subscriptionId && (
            <div className="success-modal__detail-row">
              <span className="success-modal__detail-label">Subscription ID</span>
              <span className="success-modal__detail-value success-modal__detail-value--mono">
                {subscriptionId.slice(0, 20)}…
              </span>
            </div>
          )}
          {formattedDate && (
            <div className="success-modal__detail-row">
              <span className="success-modal__detail-label">Next Billing</span>
              <span className="success-modal__detail-value">{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="success-modal__actions">
          <button
            ref={closeBtnRef}
            className="success-modal__btn success-modal__btn--primary"
            onClick={onClose}
          >
            ✦ Continue
          </button>
        </div>
      </div>
    </>
  );
}
