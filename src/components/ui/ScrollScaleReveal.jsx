import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export default function ScrollScaleReveal({
  children,
  className = '',
  startScale = 0.45,
  enabled = true,
}) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [scale, setScale] = useState(startScale);

  useEffect(() => {
    if (!enabled || shouldReduceMotion) return undefined;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const maxScroll = Math.max(1, container.offsetHeight - window.innerHeight);
      const progress = Math.min(Math.max(-rect.top / maxScroll, 0), 1);
      setScale(startScale + progress * (1 - startScale));
    };

    window.addEventListener('scroll', updateScale, { passive: true });
    window.addEventListener('resize', updateScale);
    updateScale();

    return () => {
      window.removeEventListener('scroll', updateScale);
      window.removeEventListener('resize', updateScale);
    };
  }, [enabled, shouldReduceMotion, startScale]);

  const animatedScale = enabled && !shouldReduceMotion ? scale : 1;

  return (
    <div ref={containerRef} className={`scroll-scale-reveal ${className}`.trim()}>
      <div className="scroll-scale-reveal__sticky">
        <div
          className="scroll-scale-reveal__content"
          style={{ transform: `scale(${animatedScale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
