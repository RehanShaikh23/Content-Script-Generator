import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import SubscriptionSuccessModal from './SubscriptionSuccessModal';

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    price: '399',
    currency: '₹',
    period: 'month',
    benefits: [
      'Up to 50 AI-generated scripts per month',
      'YouTube Shorts & Reels formats',
      'Access to 5 tone presets',
      'Basic script history (30 days)',
      'Standard AI model',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '1,199',
    currency: '₹',
    period: 'month',
    popular: true,
    benefits: [
      'Unlimited AI-generated scripts',
      'All video formats (Shorts, Reels, Long-form)',
      'All tone presets + custom tones',
      'Unlimited script history',
      'Advanced AI with higher accuracy',
      'Priority generation speed',
      'Export scripts as PDF / DOCX',
      'Get Personal Creator Tips from Muslim Empire',
    ],
  },
];

export default function SubscriptionModal({ isOpen, onClose, onCancelSubscription }) {
  const {
    token, subscriptionTier, isPremium, isCancellationScheduled,
    accessEndDate, refreshSubscription, updateSubscription
  } = useAuth();
  const [activating, setActivating] = useState(null);
  const [error, setError] = useState('');
  const [reactivating, setReactivating] = useState(false);

  // Success modal state
  const [successData, setSuccessData] = useState(null);

  // Format access end date
  const formattedEndDate = accessEndDate
    ? new Date(accessEndDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setActivating(null);
      setReactivating(false);
    }
  }, [isOpen]);

  // Listen for Dodo checkout completion via URL params
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const subResult = urlParams.get('subscription');
    const tier = urlParams.get('tier');

    if (subResult === 'success' && tier) {
      // Clean up URL params
      const url = new URL(window.location);
      url.searchParams.delete('subscription');
      url.searchParams.delete('tier');
      window.history.replaceState({}, '', url);

      // Refresh subscription status from server
      refreshSubscription().then(() => {
        setSuccessData({
          planName: tier.charAt(0).toUpperCase() + tier.slice(1),
          subscriptionId: '',
          nextBillingDate: null,
        });
      });
    }
  }, [isOpen, refreshSubscription]);

  /**
   * Open Dodo Payments checkout overlay for the selected plan.
   */
  async function handleDodoCheckout(plan) {
    setActivating(plan.id);
    setError('');

    try {
      const result = await apiPost('/dodo/checkout-session', { tier: plan.id }, token);

      if (!result.success || !result.checkoutUrl) {
        setError(result.error || 'Failed to create checkout session. Please try again.');
        setActivating(null);
        return;
      }

      // Open Dodo overlay checkout
      if (window.DodoPayments) {
        window.DodoPayments.Checkout.open({
          link: result.checkoutUrl,
        });

        // Poll for subscription activation after checkout
        startActivationPolling(plan);
      } else {
        // Fallback: open in new tab
        window.open(result.checkoutUrl, '_blank');
        startActivationPolling(plan);
      }
    } catch (err) {
      console.error('Checkout session error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setActivating(null);
    }
  }

  /**
   * Poll the subscription status endpoint to detect when the webhook activates the user.
   * Polls every 3s for up to 2 minutes.
   */
  function startActivationPolling(plan) {
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3s = 2 minutes

    const poller = setInterval(async () => {
      attempts++;
      try {
        await refreshSubscription();

        // Check if the subscription was activated
        const currentTier = localStorage.getItem('subscriptionTier');
        const currentStatus = localStorage.getItem('subscriptionStatus');

        if (currentTier === plan.id && currentStatus === 'ACTIVE') {
          clearInterval(poller);
          setActivating(null);
          setSuccessData({
            planName: plan.name,
            subscriptionId: '',
            nextBillingDate: null,
          });
        }
      } catch (e) {
        // Ignore polling errors
      }

      if (attempts >= maxAttempts) {
        clearInterval(poller);
        setActivating(null);
        // Don't show error — the webhook might just be delayed
      }
    }, 3000);

    // Clean up on unmount
    return () => clearInterval(poller);
  }

  // Handle success modal close — dismiss both modals
  function handleSuccessClose() {
    setSuccessData(null);
    onClose();
  }

  // Handle reactivation (legacy PayPal path)
  async function handleReactivate() {
    setReactivating(true);
    setError('');
    try {
      const result = await apiPost('/subscription/reactivate', {}, token);
      if (result.success) {
        updateSubscription(
          result.tier,
          result.status || 'ACTIVE',
          result.credits,
          null, // clear accessEndDate
          null  // clear cancellationScheduledAt
        );
        await refreshSubscription();
      } else {
        setError(result.error || 'Failed to reactivate. Please try again.');
      }
    } catch (err) {
      console.error('Reactivation error:', err);
      setError(err.message || 'Failed to reactivate subscription. Please contact support.');
    } finally {
      setReactivating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="pricing-backdrop" onClick={onClose} />
      <div className="pricing-modal">
        <button className="pricing-modal__close" onClick={onClose} title="Close">
          ✕
        </button>
        <div className="pricing-modal__header">
          <span className="pricing-modal__ornament">✦ ☽ ✦</span>
          <h2 className="pricing-modal__title">Choose Your Plan</h2>
          <p className="pricing-modal__subtitle">
            Unlock the full power of AI-driven Islamic content creation
          </p>

          {/* Payment methods badge */}
          <div className="pricing-modal__payment-methods">
            <span className="pricing-modal__payment-badge">
              💳 UPI &bull; Google Pay &bull; PhonePe &bull; Cards
            </span>
          </div>

          {isPremium && !isCancellationScheduled && (
            <p className="pricing-modal__current-plan pricing-modal__current-plan--premium">
              ⚡ You have <strong>Premium</strong> — all features are unlocked!
            </p>
          )}
          {isCancellationScheduled && (
            <div className="pricing-modal__cancel-notice">
              <p className="pricing-modal__cancel-text">
                ⏳ Your <strong>{subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</strong> plan
                is ending {formattedEndDate ? `on ${formattedEndDate}` : 'soon'}
              </p>
              <button
                className="pricing-modal__reactivate-btn"
                onClick={handleReactivate}
                disabled={reactivating}
              >
                {reactivating ? '⏳ Reactivating…' : '✦ Reactivate Subscription'}
              </button>
            </div>
          )}
          {!isPremium && !isCancellationScheduled && subscriptionTier && subscriptionTier !== 'free' && (
            <p className="pricing-modal__current-plan">
              ✦ Current plan: <strong>{subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</strong>
            </p>
          )}
        </div>

        {error && (
          <div className="pricing-modal__error">
            ⚠️ {error}
          </div>
        )}

        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscriptionTier === plan.id;
            return (
              <div
                key={plan.id}
                className={`pricing-card ${plan.popular ? 'pricing-card--premium' : ''} ${isCurrentPlan ? 'pricing-card--current' : ''}`}
              >
                {plan.popular && (
                  <span className="pricing-card__badge">✦ Most Popular</span>
                )}
                {isCurrentPlan && (
                  <span className="pricing-card__badge pricing-card__badge--current">✓ Current Plan</span>
                )}
                <h3 className="pricing-card__name">{plan.name}</h3>
                <div className="pricing-card__price">
                  <span className="pricing-card__currency">{plan.currency}</span>
                  <span className="pricing-card__amount">{plan.price}</span>
                  <span className="pricing-card__period">/{plan.period}</span>
                </div>
                <ul className="pricing-card__benefits">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="pricing-card__benefit">
                      <span className="pricing-card__check">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                {activating === plan.id ? (
                  <div className="pricing-card__activating-container">
                    <div className="pricing-card__spinner" />
                    <p className="pricing-card__activating">
                      ⏳ Verifying your subscription...
                    </p>
                  </div>
                ) : isCurrentPlan ? (
                  <div className="pricing-card__current-actions">
                    {isCancellationScheduled ? (
                      <p className="pricing-card__activating" style={{ color: '#f59e0b' }}>
                        ⏳ Cancellation scheduled
                      </p>
                    ) : (
                      <>
                        <p className="pricing-card__activating" style={{ color: '#4ade80' }}>
                          ✅ You're on this plan
                        </p>
                        {onCancelSubscription && (
                          <button
                            className="pricing-card__cancel-link"
                            onClick={() => {
                              onClose();
                              onCancelSubscription();
                            }}
                          >
                            Cancel subscription
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    className="pricing-card__subscribe-btn"
                    onClick={() => handleDodoCheckout(plan)}
                    disabled={activating !== null}
                  >
                    <span className="pricing-card__subscribe-icon">🔐</span>
                    Subscribe with UPI / Card
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel link for paid plans at bottom */}
        {subscriptionTier !== 'free' && !isCancellationScheduled && onCancelSubscription && (
          <div className="pricing-modal__footer-cancel">
            <button
              className="pricing-modal__cancel-link"
              onClick={() => {
                onClose();
                onCancelSubscription();
              }}
            >
              Cancel my subscription
            </button>
          </div>
        )}
      </div>

      {/* Success confirmation modal — overlays on top of pricing modal */}
      <SubscriptionSuccessModal
        isOpen={!!successData}
        onClose={handleSuccessClose}
        planName={successData?.planName || ''}
        subscriptionId={successData?.subscriptionId || ''}
        nextBillingDate={successData?.nextBillingDate}
      />
    </>
  );
}
