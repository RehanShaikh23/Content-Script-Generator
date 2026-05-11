import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiPost('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="header">
          <span className="header__ornament">✦ ☽ ✦</span>
          <div className="header__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="header__title">Reset Password</h1>
          <p className="header__subtitle">Enter your email to receive a password reset link</p>
        </div>

        <div className="card auth-card">
          {submitted ? (
            <div className="auth-success-state">
              <div className="auth-success-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle className="auth-success-circle" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
                  <path className="auth-success-tick" d="M20 33L28 41L44 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="auth-success-title">Check Your Email</h2>
              <p className="auth-success-text">
                If this email is registered, a reset link has been sent. 
                Please check your inbox and spam folder.
              </p>
              <p className="auth-success-expiry">
                ⏳ The link will expire in 15 minutes
              </p>
              <Link to="/login" className="generate-btn auth-btn auth-back-btn">
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field__label">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                id="forgot-submit"
                type="submit"
                className="generate-btn auth-btn"
                disabled={isLoading}
              >
                {isLoading ? '⟳ Sending…' : '✦ Send Reset Link ✦'}
              </button>
            </form>
          )}

          {!submitted && (
            <div className="auth-switch">
              Remember your password?{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </div>
          )}
        </div>

        <div className="footer">
          آمين — May Allah make your content a sadaqah jaariyah
        </div>
      </div>
    </div>
  );
}
