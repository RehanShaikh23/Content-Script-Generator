import { useEffect, useRef } from 'react';

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    planId: 'P-78B67402K5804231VNG36P2A',
    price: '12',
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
    planId: 'P-6RA473546U631442PNG36P2I',
    price: '20',
    period: 'month',
    popular: true,
    benefits: [
      'Unlimited AI-generated scripts',
      'All video formats (Shorts, Reels, Long-form)',
      'All tone presets + custom tones',
      'Unlimited script history',
      'Advanced AI model with higher accuracy',
      'Priority generation speed',
      'Export scripts as PDF / DOCX',
    ],
  },
];

export default function SubscriptionModal({ isOpen, onClose }) {
  const paypalRefs = useRef({});

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
            onApprove(data) {
              alert(
                `✅ Jazakallah Khair! Your ${plan.name} subscription is active.\n\nSubscription ID: ${data.subscriptionID}`
              );
              onClose();
            },
            onCancel() {
              console.log(`Subscription cancelled for ${plan.name}`);
            },
            onError(err) {
              console.error('PayPal error:', err);
              alert('Something went wrong with PayPal. Please try again.');
            },
          }).render(container);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

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
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.popular ? 'pricing-card--premium' : ''}`}
            >
              {plan.popular && (
                <span className="pricing-card__badge">✦ Most Popular</span>
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
              <div
                className="pricing-card__paypal"
                ref={(el) => (paypalRefs.current[plan.id] = el)}
              />
              {!window.paypal && (
                <p className="pricing-card__sdk-note">
                  PayPal is loading…
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
