import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiPost } from '../api';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import { IconLock, IconEye, IconEyeOff, IconLoader, IconArrowRight } from '../components/landing/Icons';

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

  // No token in URL
  if (!token) {
    return (
      <div className="ln-page">
        <LandingNavbar activePage="login" />
        <div className="ln-auth-page">
          <div className="ln-auth">
            <div className="ln-auth__card">
              <div className="ln-auth__header">
                <h2 className="ln-auth__title">Invalid Link</h2>
                <p className="ln-auth__subtitle">This reset link is missing or malformed</p>
              </div>
              <div className="ln-auth__error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                No reset token found. Please request a new password reset link.
              </div>
              <Link to="/forgot-password" className="ln-auth__submit" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                Request New Link
              </Link>
              <div className="ln-auth__switch">
                <Link to="/login" className="ln-auth__switch-link">Back to Sign In</Link>
              </div>
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="ln-page">
      <LandingNavbar activePage="login" />

      <div className="ln-auth-page">
        <div className="ln-auth">
          <div className="ln-auth__card">
            {success ? (
              <div className="ln-auth__success">
                <div className="ln-auth__success-icon">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle className="ln-auth__success-circle" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
                    <path className="ln-auth__success-tick" d="M20 33L28 41L44 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="ln-auth__title">Password Reset</h2>
                <p className="ln-auth__subtitle">
                  Your password has been updated successfully. Redirecting to sign in...
                </p>
                <div className="ln-auth__redirect-dots">
                  <span /><span /><span />
                </div>
              </div>
            ) : (
              <>
                <div className="ln-auth__header">
                  <h2 className="ln-auth__title">Create New Password</h2>
                  <p className="ln-auth__subtitle">Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="ln-auth__field">
                    <label className="ln-auth__label" htmlFor="reset-new-password">New Password</label>
                    <div className="ln-auth__input-wrap">
                      <span className="ln-auth__input-icon"><IconLock size={18} /></span>
                      <input
                        id="reset-new-password"
                        type={showPassword ? 'text' : 'password'}
                        className="ln-auth__input ln-auth__input--password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="ln-auth__toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength */}
                    {newPassword && (
                      <div className="ln-auth__strength">
                        <div className="ln-auth__strength-track">
                          <div
                            className="ln-auth__strength-bar"
                            style={{
                              width: `${(strength.level / 4) * 100}%`,
                              backgroundColor: strength.color,
                            }}
                          />
                        </div>
                        <span className="ln-auth__strength-label" style={{ color: strength.color }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ln-auth__field">
                    <label className="ln-auth__label" htmlFor="reset-confirm-password">Confirm Password</label>
                    <div className="ln-auth__input-wrap">
                      <span className="ln-auth__input-icon"><IconLock size={18} /></span>
                      <input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="ln-auth__input ln-auth__input--password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your new password"
                        required
                      />
                      <button
                        type="button"
                        className="ln-auth__toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
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
                    id="reset-submit"
                    type="submit"
                    className="ln-auth__submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><span className="ln-auth__spinner"><IconLoader size={18} /></span>Resetting...</>
                    ) : (
                      <>Reset Password <IconArrowRight size={16} /></>
                    )}
                  </button>
                </form>

                <div className="ln-auth__switch">
                  <Link to="/login" className="ln-auth__switch-link">Back to Sign In</Link>
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
