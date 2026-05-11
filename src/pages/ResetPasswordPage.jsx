import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiPost } from '../api';

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: '#dc2626' };
  if (score === 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { level: 3, label: 'Good', color: '#10b981' };
  return { level: 4, label: 'Strong', color: '#059669' };
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await apiPost('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // No token in URL — show error state
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <div className="header">
            <span className="header__ornament">✦ ☽ ✦</span>
            <h1 className="header__title">Invalid Link</h1>
            <p className="header__subtitle">This reset link is missing or malformed</p>
          </div>
          <div className="card auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-error">
              No reset token found. Please request a new password reset link.
            </div>
            <Link to="/forgot-password" className="generate-btn auth-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
              ✦ Request New Link ✦
            </Link>
            <div className="auth-switch" style={{ marginTop: '1.25rem' }}>
              <Link to="/login" className="auth-link">Back to Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="header">
          <span className="header__ornament">✦ ☽ ✦</span>
          <div className="header__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="header__title">Create New Password</h1>
          <p className="header__subtitle">Enter your new password below</p>
        </div>

        <div className="card auth-card">
          {success ? (
            <div className="auth-success-state">
              <div className="auth-success-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle className="auth-success-circle" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
                  <path className="auth-success-tick" d="M20 33L28 41L44 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="auth-success-title">Password Reset!</h2>
              <p className="auth-success-text">
                Your password has been updated successfully.
                Redirecting to sign in…
              </p>
              <div className="auth-redirect-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field__label">New Password</label>
                <div className="password-field">
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoFocus
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

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="password-strength">
                    <div className="password-strength__track">
                      <div
                        className="password-strength__bar"
                        style={{
                          width: `${(strength.level / 4) * 100}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    <span
                      className="password-strength__label"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field__label">Confirm Password</label>
                <div className="password-field">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    required
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
                id="reset-submit"
                type="submit"
                className="generate-btn auth-btn"
                disabled={isLoading}
              >
                {isLoading ? '⟳ Resetting…' : '✦ Reset Password ✦'}
              </button>
            </form>
          )}

          {!success && (
            <div className="auth-switch">
              <Link to="/login" className="auth-link">Back to Sign In</Link>
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
