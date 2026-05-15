import { Link } from 'react-router-dom';
import { IconArrowRight, IconBookOpen, IconCpu, IconLanguages, IconUsers } from './Icons';

export default function HeroSection() {
  return (
    <section className="ln-hero" id="hero">
      {/* Animated background */}
      <div className="ln-hero__bg" aria-hidden="true">
        <div className="ln-hero__grid" />
        <div className="ln-hero__glow" />
      </div>

      <div className="ln-hero__content">
        {/* Badge */}
        <div className="ln-hero__badge">
          <span className="ln-hero__badge-dot" />
          AI-Powered Islamic Content Platform
        </div>

        {/* Headline */}
        <h1 className="ln-hero__title" id="hero-title">
          Generate Viral Islamic<br />Content in Seconds
        </h1>

        {/* Subheading */}
        <p className="ln-hero__subtitle">
          Create engaging, authentic video scripts for YouTube, Reels, and TikTok — powered by AI trained on Quran, Hadith, and Islamic sources.
        </p>

        {/* CTA */}
        <div className="ln-hero__cta">
          <Link to="/signup" className="ln-hero__btn ln-hero__btn--primary" id="hero-cta-start">
            Start Creating
            <IconArrowRight size={18} />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="ln-hero__trust">
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconBookOpen size={16} /></span>
            Quran Based
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconCpu size={16} /></span>
            AI Powered
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconLanguages size={16} /></span>
            Multi Language
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconUsers size={16} /></span>
            Creator Focused
          </div>
        </div>
      </div>

      {/* Floating Dashboard Preview */}
      <div className="ln-hero__preview" aria-hidden="true">
        <div className="ln-hero__preview-card">
          <div className="ln-hero__preview-header">
            <div className="ln-hero__preview-dots">
              <span /><span /><span />
            </div>
            <span className="ln-hero__preview-title">Script Generator</span>
          </div>
          <div className="ln-hero__preview-body">
            <div className="ln-hero__preview-field">
              <div className="ln-hero__preview-label" />
              <div className="ln-hero__preview-input" />
            </div>
            <div className="ln-hero__preview-grid">
              <div className="ln-hero__preview-chip ln-hero__preview-chip--active" />
              <div className="ln-hero__preview-chip" />
              <div className="ln-hero__preview-chip" />
            </div>
            <div className="ln-hero__preview-output">
              <div className="ln-hero__preview-line ln-hero__preview-line--w80" />
              <div className="ln-hero__preview-line ln-hero__preview-line--w60" />
              <div className="ln-hero__preview-line ln-hero__preview-line--w90" />
              <div className="ln-hero__preview-line ln-hero__preview-line--w45" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
