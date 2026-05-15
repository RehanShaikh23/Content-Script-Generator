import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { IconArrowRight } from './Icons';

export default function CTASection() {
  const ref = useScrollReveal();

  return (
    <section className="ln-cta" id="cta" ref={ref}>
      <div className="ln-cta__inner ln-scroll-reveal">
        <h2 className="ln-cta__title">Start Creating Islamic Content Today</h2>
        <p className="ln-cta__subtitle">
          Join thousands of Muslim creators using AI to produce high-quality Islamic videos.
        </p>
        <Link to="/signup" className="ln-cta__btn" id="cta-get-started">
          Get Started Free
          <IconArrowRight size={18} />
        </Link>
        <p className="ln-cta__note">No credit card required</p>
      </div>
    </section>
  );
}
