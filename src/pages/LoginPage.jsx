import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-wrapper auth-wrapper--with-landing">
      <div className="auth-container">
        <div className="header">
          <span className="header__ornament">✦ ☽ ✦</span>
          <div className="header__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="header__title">Islamic Script Generator</h1>
          <p className="header__subtitle">AI-powered Islamic content creation tool by Muslim Empire</p>
        </div>

        {/* ─── CTA Above the Fold ─── */}
        <div className="seo-hero-cta">
          <Link to="/signup" className="seo-hero-cta__btn" id="hero-cta-generate">
             Generate Islamic Script Now ✦
          </Link>
          <p className="seo-hero-cta__sub">Free to start · No credit card required</p>
        </div>

        <div className="card auth-card">
          <h2 className="auth-card__title">Welcome Back</h2>
          <p className="auth-card__subtitle">Sign in to continue generating Islamic scripts</p>
          <form onSubmit={handleSubmit} id="login-form">
            <div className="field">
              <label className="field__label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-field__toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-forgot-row">
              <Link to="/forgot-password" className="auth-forgot-link">Forgot Password?</Link>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="generate-btn auth-btn"
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading ? '⟳ Signing in…' : ' Sign In ✦'}
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Create one</Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SEO Landing Content — Visible to search crawlers
          ═══════════════════════════════════════════════ */}
      <section className="seo-landing" aria-label="About Islamic Script Generator">

        {/* What This Tool Does */}
        <div className="seo-section">
          <h2 className="seo-section__title">What Is the Islamic Script Generator?</h2>
          <p className="seo-section__text">
            The <strong>Islamic Script Generator</strong> is an AI-powered content creation tool designed
            specifically for Muslim creators. It generates ready-to-use video scripts for <strong>YouTube Shorts</strong>,
            Instagram Reels, TikTok, and long-form videos all focused on authentic Islamic content.
          </p>
          <p className="seo-section__text">
            Whether you need a <strong>Quran reminder script</strong>, a <strong>hadith content</strong> piece,
            a <strong>Prophet's story</strong> narrative, or an <strong>Islamic motivational video script</strong>,
            our AI crafts engaging content in seconds.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="seo-section">
          <h2 className="seo-section__title">Powerful Features for Islamic Creators</h2>
          <div className="seo-features">
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">⚡</span>
              <h3 className="seo-feature__title">AI-Powered Scripts</h3>
              <p className="seo-feature__text">Generate Islamic video scripts in seconds with advanced AI trained on authentic Islamic sources.</p>
            </article>
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">📱</span>
              <h3 className="seo-feature__title">YouTube Shorts & Reels</h3>
              <p className="seo-feature__text">Optimized scripts for short-form content perfect for Islamic YouTube Shorts and Instagram Reels.</p>
            </article>
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">📖</span>
              <h3 className="seo-feature__title">8 Content Categories</h3>
              <p className="seo-feature__text">Quran & Tafsir, Hadith & Sunnah, Prophets' Stories, Islamic History, Fiqh, Duas, Akhirah, and Modern Issues.</p>
            </article>
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">🌍</span>
              <h3 className="seo-feature__title">9 Languages</h3>
              <p className="seo-feature__text">Create Islamic content in English, Arabic, Urdu, Hindi, Bangla, Turkish, Malay, French, and Spanish.</p>
            </article>
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">📅</span>
              <h3 className="seo-feature__title">Content Calendar</h3>
              <p className="seo-feature__text">Plan 7–30 days of structured Islamic content with our AI-powered Content Calendar Planner.</p>
            </article>
            <article className="seo-feature">
              <span className="seo-feature__icon" aria-hidden="true">🎯</span>
              <h3 className="seo-feature__title">Creator Tips</h3>
              <p className="seo-feature__text">Get exclusive upload strategies from Muslim Empire, a 300K+ subscriber Islamic YouTube channel.</p>
            </article>
          </div>
        </div>

        {/* Who It's For */}
        <div className="seo-section">
          <h2 className="seo-section__title">Who Is This Tool For?</h2>
          <div className="seo-audience">
            <div className="seo-audience__item">
              <span className="seo-audience__icon" aria-hidden="true">▶</span>
              <div>
                <h3 className="seo-audience__title">Islamic YouTubers</h3>
                <p className="seo-audience__text">Save hours of scriptwriting. Generate engaging YouTube Shorts scripts that get views and grow your Islamic channel.</p>
              </div>
            </div>
            <div className="seo-audience__item">
              <span className="seo-audience__icon" aria-hidden="true">📲</span>
              <div>
                <h3 className="seo-audience__title">Social Media Da'wah</h3>
                <p className="seo-audience__text">Create consistent, high-quality Islamic content for Instagram Reels, TikTok, and Facebook to spread the message of Islam.</p>
              </div>
            </div>
            <div className="seo-audience__item">
              <span className="seo-audience__icon" aria-hidden="true">🕌</span>
              <div>
                <h3 className="seo-audience__title">Islamic Educators</h3>
                <p className="seo-audience__text">Generate educational content about Quran, Hadith, and Islamic topics for your students and community.</p>
              </div>
            </div>
            <div className="seo-audience__item">
              <span className="seo-audience__icon" aria-hidden="true">🌙</span>
              <div>
                <h3 className="seo-audience__title">Muslim Content Creators</h3>
                <p className="seo-audience__text">Whether you're starting or scaling, get professional Islamic scripts that resonate with your audience.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="seo-section">
          <h2 className="seo-section__title">How It Works 3 Simple Steps</h2>
          <div className="seo-steps">
            <div className="seo-step">
              <span className="seo-step__number">1</span>
              <h3 className="seo-step__title">Choose Your Topic</h3>
              <p className="seo-step__text">Enter any Islamic topic from "The Power of Istighfar" to "Signs of Qiyamah" and select your preferred format, category, and tone.</p>
            </div>
            <div className="seo-step">
              <span className="seo-step__number">2</span>
              <h3 className="seo-step__title">AI Generates Your Script</h3>
              <p className="seo-step__text">Our AI creates a complete, engaging video script with Quranic ayat, hadith references, and a compelling narrative structure.</p>
            </div>
            <div className="seo-step">
              <span className="seo-step__number">3</span>
              <h3 className="seo-step__title">Copy, Export & Publish</h3>
              <p className="seo-step__text">Copy to clipboard, export as PDF/DOCX, or plan your entire month with the Content Calendar — then record and publish!</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="seo-section">
          <h2 className="seo-section__title">Frequently Asked Questions</h2>
          <div className="seo-faq">
            {[
              {
                q: 'What is the Islamic Script Generator?',
                a: 'The Islamic Script Generator is an AI-powered tool that creates ready-to-use video scripts for Islamic content. It generates scripts for YouTube Shorts, Reels, TikTok, and long-form videos covering Quran, Hadith, Prophet stories, Islamic history, and more.'
              },
              {
                q: 'Is the Islamic Script Generator free to use?',
                a: 'Yes! We offer a free plan with limited credits so you can try it immediately. Premium plans starting at $5/month offer unlimited scripts, multi-language support, PDF/DOCX export, and exclusive Creator Tips.'
              },
              {
                q: 'What types of Islamic content can I generate?',
                a: 'You can generate scripts across 8 categories: Quran & Tafsir, Hadith & Sunnah, Prophets\' Stories, Islamic History, Fiqh & Rulings, Duas & Dhikr, Akhirah & Jannah, and Modern Islamic Issues. Multiple tone options are available including educational, inspirational, and story-based.'
              },
              {
                q: 'What languages are supported?',
                a: 'The Islamic Script Generator supports 9 languages: English, Arabic, Urdu, Hindi, Bangla, Turkish, Malay/Indonesian, French, and Spanish. Multi-language support is available on Premium plans.'
              },
              {
                q: 'How does this help grow my Islamic YouTube channel?',
                a: 'Our tool generates optimized, engaging scripts specifically designed for Islamic content. Premium users also get exclusive Creator Tips from Muslim Empire, a 300K+ subscriber Islamic YouTube channel, covering upload strategies, SEO optimization, and content planning to help you reach more viewers.'
              },
            ].map((item, i) => (
              <div key={i} className={`seo-faq__item ${faqOpen === i ? 'seo-faq__item--open' : ''}`}>
                <button
                  className="seo-faq__question"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  aria-expanded={faqOpen === i}
                  id={`faq-${i}`}
                >
                  <span>{item.q}</span>
                  <span className="seo-faq__chevron">{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && (
                  <div className="seo-faq__answer" role="region" aria-labelledby={`faq-${i}`}>
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="seo-section seo-section--cta">
          <h2 className="seo-section__title">Ready to Create Islamic Content?</h2>
          <p className="seo-section__text">
            Join thousands of Muslim creators using the Islamic Script Generator to produce high-quality Islamic videos.
          </p>
          <Link to="/signup" className="seo-hero-cta__btn" id="bottom-cta-signup">
            ✦ Get Started Free ✦
          </Link>
        </div>

        {/* SEO Footer */}
        <footer className="seo-footer">
          <p>© {new Date().getFullYear()} Muslim Empire. All rights reserved.</p>
          <p className="seo-footer__tagline">
            Islamic Script Generator — The #1 AI tool for Islamic content creators.
            Generate Quran reminder scripts, hadith content, Islamic YouTube Shorts scripts, and more.
          </p>
        </footer>
      </section>
    </div>
  );
}
