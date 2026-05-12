import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signup(fullName, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="auth-wrapper auth-wrapper--with-landing">
      <div className="auth-container">
        <div className="header">
          <span className="header__ornament">✦ ☽ ✦</span>
          <div className="header__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="header__title">Islamic Script Generator</h1>
          <p className="header__subtitle">Create your free account and start generating Islamic content</p>
        </div>

        <div className="card auth-card">
          <h2 className="auth-card__title">Create Account</h2>
          <p className="auth-card__subtitle">Join the Islamic Script Generator community</p>
          <form onSubmit={handleSubmit} id="signup-form">
            <div className="field">
              <label className="field__label" htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Muhammad Ahmad"
                required
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="signup-password">Password</label>
              <div className="password-field">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-field__toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="signup-confirm">Confirm Password</label>
              <div className="password-field">
                <input
                  id="signup-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-field__toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="generate-btn auth-btn"
              disabled={isLoading}
              id="signup-submit"
            >
              {isLoading ? '⟳ Creating account…' : '✦ Create Account ✦'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>

      {/* ─── Condensed SEO Landing Content ─── */}
      <section className="seo-landing seo-landing--compact" aria-label="About Islamic Script Generator">
        <div className="seo-section">
          <h2 className="seo-section__title">Why Choose Islamic Script Generator?</h2>
          <div className="seo-benefits">
            <div className="seo-benefit">
              <span className="seo-benefit__icon" aria-hidden="true">✦</span>
              <div>
                <h3 className="seo-benefit__title">Save Hours of Writing</h3>
                <p className="seo-benefit__text">Generate complete Islamic video scripts in seconds — no more staring at a blank page.</p>
              </div>
            </div>
            <div className="seo-benefit">
              <span className="seo-benefit__icon" aria-hidden="true">✦</span>
              <div>
                <h3 className="seo-benefit__title">Authentic Islamic Content</h3>
                <p className="seo-benefit__text">AI trained to produce content based on Quran, Hadith, and authentic Islamic sources.</p>
              </div>
            </div>
            <div className="seo-benefit">
              <span className="seo-benefit__icon" aria-hidden="true">✦</span>
              <div>
                <h3 className="seo-benefit__title">Grow Your Islamic Channel</h3>
                <p className="seo-benefit__text">Used by creators worldwide to build consistent, engaging Islamic content that gets views.</p>
              </div>
            </div>
            <div className="seo-benefit">
              <span className="seo-benefit__icon" aria-hidden="true">✦</span>
              <div>
                <h3 className="seo-benefit__title">Multiple Formats & Languages</h3>
                <p className="seo-benefit__text">YouTube Shorts, Reels, long-form videos — in 9 languages including Arabic, Urdu, and Hindi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="seo-section seo-section--pricing">
          <h2 className="seo-section__title">Simple, Transparent Pricing</h2>
          <div className="seo-pricing">
            <div className="seo-pricing__card">
              <h3 className="seo-pricing__name">Free</h3>
              <div className="seo-pricing__price">$0</div>
              <p className="seo-pricing__desc">Try with limited credits</p>
            </div>
            <div className="seo-pricing__card">
              <h3 className="seo-pricing__name">Standard</h3>
              <div className="seo-pricing__price">$5<span>/mo</span></div>
              <p className="seo-pricing__desc">50 scripts per month</p>
            </div>
            <div className="seo-pricing__card seo-pricing__card--popular">
              <span className="seo-pricing__badge">Most Popular</span>
              <h3 className="seo-pricing__name">Premium</h3>
              <div className="seo-pricing__price">$15<span>/mo</span></div>
              <p className="seo-pricing__desc">Unlimited + Creator Tips</p>
            </div>
          </div>
        </div>

        <footer className="seo-footer">
          <p>© {new Date().getFullYear()} Muslim Empire. All rights reserved.</p>
        </footer>
      </section>
    </div>
  );
}
