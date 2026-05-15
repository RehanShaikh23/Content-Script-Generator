import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import { IconMail, IconLoader, IconArrowRight, IconCheck } from '../components/landing/Icons';

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
    <div className="ln-page">
      <LandingNavbar activePage="login" />

      <div className="ln-auth-page">
        <div className="ln-auth">
          <div className="ln-auth__card">
            {submitted ? (
              <div className="ln-auth__success">
                <div className="ln-auth__success-icon">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle className="ln-auth__success-circle" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
                    <path className="ln-auth__success-tick" d="M20 33L28 41L44 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="ln-auth__title">Check Your Email</h2>
                <p className="ln-auth__subtitle" style={{ marginBottom: '1rem' }}>
                  If this email is registered, a reset link has been sent. Check your inbox and spam folder.
                </p>
                <div className="ln-auth__expiry">
                  <IconCheck size={14} />
                  Link expires in 15 minutes
                </div>
                <Link to="/login" className="ln-auth__submit" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginTop: '1.5rem' }}>
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="ln-auth__header">
                  <h2 className="ln-auth__title">Reset Password</h2>
                  <p className="ln-auth__subtitle">Enter your email to receive a password reset link</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="ln-auth__field">
                    <label className="ln-auth__label" htmlFor="forgot-email">Email address</label>
                    <div className="ln-auth__input-wrap">
                      <span className="ln-auth__input-icon"><IconMail size={18} /></span>
                      <input
                        id="forgot-email"
                        type="email"
                        className="ln-auth__input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="ln-auth__error" role="alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    id="forgot-submit"
                    type="submit"
                    className="ln-auth__submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><span className="ln-auth__spinner"><IconLoader size={18} /></span>Sending...</>
                    ) : (
                      <>Send Reset Link <IconArrowRight size={16} /></>
                    )}
                  </button>
                </form>

                <div className="ln-auth__switch">
                  Remember your password? <Link to="/login" className="ln-auth__switch-link">Sign in</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
