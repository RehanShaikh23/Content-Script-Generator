import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import SubscriptionSuccessModal from './SubscriptionSuccessModal';

// ── Plan definitions for both providers ──
const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    // PayPal plan IDs (USD)
    paypalPlanId: 'P-78B67402K5804231VNG36P2A',
    priceUSD: '5',
    priceINR: '399',
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
    paypalPlanId: 'P-6RA473546U631442PNG36P2I',
    priceUSD: '15',
    priceINR: '1,199',
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

/**
 * Detect if user is likely from India (for defaulting to UPI tab).
 */
function detectIndianUser() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return true;
    const lang = navigator.language || '';
    if (lang.startsWith('hi') || lang.startsWith('bn') || lang.startsWith('ta') ||
        lang.startsWith('te') || lang.startsWith('mr') || lang.startsWith('gu')) return true;
  } catch {}
  return false;
}

export default function SubscriptionModal({ isOpen, onClose, onCancelSubscription }) {
  const {
    token, subscriptionTier, isPremium, isCancellationScheduled,
    accessEndDate, refreshSubscription, updateSubscription
  } = useAuth();

  const paypalRefs = useRef({});
  const [activating, setActivating] = useState(null);
  const [error, setError] = useState('');
  const [reactivating, setReactivating] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Payment method toggle: 'upi' (Dodo) or 'paypal'
  const [paymentMethod, setPaymentMethod] = useState(
    detectIndianUser() ? 'upi' : 'paypal'
  );

  // Format access end date
  const formattedEndDate = accessEndDate
    ? new Date(accessEndDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // ── Render PayPal buttons when PayPal tab is active ──
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'paypal') return;

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
                plan_id: plan.paypalPlanId,
              });
            },
            async onApprove(data) {
              setActivating(plan.id);
              setError('');

              try {
                const result = await apiPost('/subscription/activate', {
                  subscriptionId: data.subscriptionID,
                  planId: plan.paypalPlanId,
                  tier: plan.id,
                }, token);

                if (result.success) {
                  updateSubscription(
                    result.tier || plan.id,
                    result.status || 'ACTIVE',
                    result.credits
                  );
                  await refreshSubscription();
                  setSuccessData({
                    planName: plan.name,
                    subscriptionId: data.subscriptionID,
                    nextBillingDate: result.nextBillingDate || null,
                  });
                } else {
                  setError(result.error || 'Subscription verification failed.');
                }
              } catch (err) {
                console.error('PayPal activation error:', err);
                setError(err.message || 'Failed to activate subscription.');
              } finally {
                setActivating(null);
              }
            },
            onCancel() {
              console.log(`PayPal subscription cancelled for ${plan.name}`);
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
  }, [isOpen, paymentMethod, token, refreshSubscription, updateSubscription]);

  // Clear PayPal button containers when switching away from PayPal
  useEffect(() => {
    if (paymentMethod !== 'paypal') {
      Object.values(paypalRefs.current).forEach(container => {
        if (container) container.innerHTML = '';
      });
    }
  }, [paymentMethod]);

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
      const url = new URL(window.location);
      url.searchParams.delete('subscription');
      url.searchParams.delete('tier');
      window.history.replaceState({}, '', url);

      refreshSubscription().then(() => {
        setSuccessData({
          planName: tier.charAt(0).toUpperCase() + tier.slice(1),
          subscriptionId: '',
          nextBillingDate: null,
        });
      });
    }
  }, [isOpen, refreshSubscription]);

  // ── Dodo Checkout (UPI/Card) ──
  async function handleDodoCheckout(plan) {
    setActivating(plan.id);
    setError('');

    try {
      const result = await apiPost('/dodo/checkout-session', { tier: plan.id }, token);

      if (!result.success || !result.checkoutUrl) {
        setError(result.error || 'Failed to create checkout session.');
        setActivating(null);
        return;
      }

      if (window.DodoPayments) {
        window.DodoPayments.Checkout.open({ link: result.checkoutUrl });
        startActivationPolling(plan);
      } else {
        window.open(result.checkoutUrl, '_blank');
        startActivationPolling(plan);
      }
    } catch (err) {
      console.error('Dodo checkout error:', err);
      setError(err.message || 'Failed to start checkout.');
      setActivating(null);
    }
  }

  function startActivationPolling(plan) {
    let attempts = 0;
    const maxAttempts = 40;

    const poller = setInterval(async () => {
      attempts++;
      try {
        await refreshSubscription();
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
      } catch {}

      if (attempts >= maxAttempts) {
        clearInterval(poller);
        setActivating(null);
      }
    }, 3000);
  }

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
          null,
          null
        );
        await refreshSubscription();
      } else {
        setError(result.error || 'Failed to reactivate.');
      }
    } catch (err) {
      console.error('Reactivation error:', err);
      setError(err.message || 'Failed to reactivate subscription.');
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

          {/* ── Payment Method Toggle ── */}
          <div className="pricing-modal__payment-toggle">
            <button
              className={`pricing-modal__toggle-btn ${paymentMethod === 'upi' ? 'pricing-modal__toggle-btn--active' : ''}`}
              onClick={() => setPaymentMethod('upi')}
            >
              🇮🇳 UPI / Indian Cards
            </button>
            <button
              className={`pricing-modal__toggle-btn ${paymentMethod === 'paypal' ? 'pricing-modal__toggle-btn--active' : ''}`}
              onClick={() => setPaymentMethod('paypal')}
            >
              💳 PayPal / International
            </button>
          </div>
        </div>

        {error && (
          <div className="pricing-modal__error">
            ⚠️ {error}
          </div>
        )}

        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscriptionTier === plan.id;
            const price = paymentMethod === 'upi' ? plan.priceINR : plan.priceUSD;
            const currency = paymentMethod === 'upi' ? '₹' : '$';

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
                  <span className="pricing-card__currency">{currency}</span>
                  <span className="pricing-card__amount">{price}</span>
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
                ) : paymentMethod === 'upi' ? (
                  /* ── Dodo/UPI Button ── */
                  <button
                    className="pricing-card__subscribe-btn"
                    onClick={() => handleDodoCheckout(plan)}
                    disabled={activating !== null}
                  >
                    <span className="pricing-card__subscribe-icon">🔐</span>
                    Pay with UPI / Card
                  </button>
                ) : (
                  /* ── PayPal Button ── */
                  <>
                    <div
                      className="pricing-card__paypal"
                      ref={(el) => (paypalRefs.current[plan.id] = el)}
                    />
                    {!window.paypal && (
                      <p className="pricing-card__sdk-note">
                        PayPal is loading…
                      </p>
                    )}
                  </>
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
