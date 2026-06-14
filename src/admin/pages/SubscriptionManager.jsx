import { useState } from 'react';

export default function SubscriptionManager({ user, onClose, onUpdate }) {
  const [tier, setTier] = useState(user.subscriptionTier || 'free');
  const [credits, setCredits] = useState(user.credits >= 999999 ? '' : String(user.credits));
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  async function handleAction(action) {
    setLoading(true);
    try {
      switch (action) {
        case 'upgrade':
          await onUpdate(user.id, { tier: 'premium', status: 'ACTIVE', credits: 999999 });
          break;
        case 'downgrade':
          await onUpdate(user.id, { tier: 'free', status: 'NONE', credits: 10 });
          break;
        case 'cancel':
          await onUpdate(user.id, { tier: user.subscriptionTier, status: 'NONE', credits: 10 });
          break;
        case 'credits':
          await onUpdate(user.id, { credits: parseInt(credits, 10) || 0 });
          break;
        default:
          break;
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  return (
    <>
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal">
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">Manage Subscription</h2>
          <button className="admin-modal__close" onClick={onClose}>×</button>
        </div>

        {/* User Info */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="admin-table__user-cell" style={{ marginBottom: '1rem' }}>
            <div className="admin-table__user-avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
              {user.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="admin-table__user-name" style={{ fontSize: '0.92rem' }}>{user.fullName}</div>
              <div className="admin-table__user-email">{user.email}</div>
            </div>
          </div>

          <div className="admin-sub-row">
            <span className="admin-sub-row__label">Current Plan</span>
            <span className={`admin-badge admin-badge--${user.subscriptionTier}`}>
              {user.subscriptionTier}
            </span>
          </div>
          <div className="admin-sub-row">
            <span className="admin-sub-row__label">Status</span>
            <span className={`admin-badge admin-badge--${user.subscriptionStatus === 'ACTIVE' ? 'active' : user.subscriptionStatus === 'CANCELLATION_SCHEDULED' ? 'cancelling' : 'none'}`}>
              {user.subscriptionStatus}
            </span>
          </div>
          <div className="admin-sub-row">
            <span className="admin-sub-row__label">Credits</span>
            <span className="admin-sub-row__value">
              {user.credits >= 999999 ? '∞ (Unlimited)' : user.credits}
            </span>
          </div>
          {user.paymentProvider && user.paymentProvider !== 'none' && (
            <div className="admin-sub-row">
              <span className="admin-sub-row__label">Payment Provider</span>
              <span className="admin-sub-row__value" style={{ textTransform: 'capitalize' }}>
                {user.paymentProvider}
              </span>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div className="admin-alert admin-alert--info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.6rem' }}>
            <div>
              {confirmAction === 'upgrade' && '⬆ Upgrade this user to Premium? They will get unlimited credits.'}
              {confirmAction === 'downgrade' && '⬇ Downgrade this user to Free? Their credits will be reset to 10.'}
              {confirmAction === 'cancel' && '⚠ Cancel this user\'s subscription? Their plan will be set to Free with 10 credits.'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setConfirmAction(null)}
                disabled={loading}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                className={`admin-btn ${confirmAction === 'cancel' ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                onClick={() => handleAction(confirmAction)}
                disabled={loading}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
              >
                {loading ? <div className="admin-spinner" style={{ width: 14, height: 14 }} /> : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!confirmAction && (
          <div className="admin-sub-actions">
            {user.subscriptionTier !== 'premium' && (
              <button
                className="admin-btn admin-btn--primary admin-btn--full"
                onClick={() => setConfirmAction('upgrade')}
                disabled={loading}
              >
                ⬆ Upgrade to Premium
              </button>
            )}

            {user.subscriptionTier !== 'free' && (
              <button
                className="admin-btn admin-btn--secondary admin-btn--full"
                onClick={() => setConfirmAction('downgrade')}
                disabled={loading}
              >
                ⬇ Downgrade to Free
              </button>
            )}

            {user.subscriptionStatus === 'ACTIVE' && (
              <button
                className="admin-btn admin-btn--danger admin-btn--full"
                onClick={() => setConfirmAction('cancel')}
                disabled={loading}
              >
                ✕ Cancel Subscription
              </button>
            )}

            {/* Manual Credits */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
              <label className="admin-field__label">Set Credits Manually</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="admin-field__input"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="e.g. 50"
                  min="0"
                  style={{ flex: 1 }}
                />
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => handleAction('credits')}
                  disabled={loading || credits === ''}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {loading ? <div className="admin-spinner" style={{ width: 14, height: 14 }} /> : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
