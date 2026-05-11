import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import SubscriptionSuccessModal from './SubscriptionSuccessModal';

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    // ⚠️ SANDBOX plan ID — replace with live ID for production
    planId: 'P-3RC21604VW709292JNH3DBOQ',
    price: '5',
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
    // ⚠️ SANDBOX plan ID — replace with live ID for production
    planId: 'P-56E7053043019235UNH3DBXQ',
    price: '15',
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

// ────────────────────────────────────────────────────────────────
// 🔑  PRODUCTION PLAN IDS (uncomment when going live):
// Standard: P-78B67402K5804231VNG36P2A
// Premium:  P-6RA473546U631442PNG36P2I
// ────────────────────────────────────────────────────────────────

export default function SubscriptionModal({ isOpen, onClose, onCancelSubscription }) {
  const {
    token, subscriptionTier, isPremium, isCancellationScheduled,
    accessEndDate, refreshSubscription, updateSubscription
  } = useAuth();
  const paypalRefs = useRef({});
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

  useEffect(() => {
    if (!isOpen) return;

    // Small delay to let the DOM render the containers
    const timer = setTimeout(() => {
      PLANS.forEach((plan) => {
        const container = paypalRefs.current[plan.id];
        if (!container || container.hasChildNodes()) return;

        if (window.paypal) {
          window.paypal.Buttons({
            style: {
              shape: 'pill',
              color: 'gold',
              layout: 'vertical',
              label: 'subscribe',
            },
            createSubscription(data, actions) {
              return actions.subscription.create({
                plan_id: plan.planId,
              });
            },
            async onApprove(data) {
              setActivating(plan.id);
              setError('');

              try {
                // Tell backend to verify & activate the subscription
                const result = await apiPost('/subscription/activate', {
                  subscriptionId: data.subscriptionID,
                  planId: plan.planId,
                  tier: plan.id,
                }, token);

                if (result.success) {
                  // Instantly update UI state — no page reload needed
                  updateSubscription(
                    result.tier || plan.id,
                    result.status || 'ACTIVE',
                    result.credits
                  );

                  // Also refresh from server for consistency
                  await refreshSubscription();

                  // Show success modal instead of alert()
                  setSuccessData({
                    planName: plan.name,
                    subscriptionId: data.subscriptionID,
                    nextBillingDate: result.nextBillingDate || null,
                  });
                } else {
                  setError(result.error || 'Subscription verification failed. Please contact support.');
                }
              } catch (err) {
                console.error('Subscription activation error:', err);
                setError(err.message || 'Failed to activate subscription. Please contact support.');
              } finally {
                setActivating(null);
              }
            },
            onCancel() {
              console.log(`Subscription cancelled for ${plan.name}`);
            },
            onError(err) {
              console.error('PayPal error:', err);
              setError('Something went wrong with PayPal. Please try again.');
            },
          }).render(container);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, onClose, token, refreshSubscription, updateSubscription]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setActivating(null);
      setReactivating(false);
    }
  }, [isOpen]);

  // Handle success modal close — dismiss both modals
  function handleSuccessClose() {
    setSuccessData(null);
    onClose();
  }

  // Handle reactivation
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
                  <span className="pricing-card__currency">$</span>
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
                  <p className="pricing-card__activating">
                    ⏳ Verifying your subscription...
                  </p>
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
                  <div
                    className="pricing-card__paypal"
                    ref={(el) => (paypalRefs.current[plan.id] = el)}
                  />
                )}

                {!window.paypal && !isCurrentPlan && (
                  <p className="pricing-card__sdk-note">
                    PayPal is loading…
                  </p>
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
