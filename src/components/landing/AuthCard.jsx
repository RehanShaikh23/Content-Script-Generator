import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconEye, IconEyeOff, IconMail, IconLock, IconUser, IconLoader } from './Icons';

/**
 * Reusable premium auth card for login/signup/forgot/reset.
 * Props:
 * - mode: 'login' | 'signup'
 * - onSubmit: async (data) => void
 * - error: string
 * - isLoading: boolean
 */
export default function AuthCard({ mode = 'login', onSubmit, error, isLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const isLogin = mode === 'login';

  function handleSubmit(e) {
    e.preventDefault();
    if (isLogin) {
      onSubmit({ email, password, rememberMe });
    } else {
      onSubmit({ fullName, email, password, confirmPassword });
    }
  }

  return (
    <div className="ln-auth" id="auth-section">
      <div className="ln-auth__card">
        {/* Header */}
        <div className="ln-auth__header">
          <h2 className="ln-auth__title">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="ln-auth__subtitle">
            {isLogin
              ? 'Sign in to continue generating Islamic scripts'
              : 'Start creating Islamic content for free'
            }
          </p>
        </div>

        {/* Divider */}
        <div className="ln-auth__divider">
          <span>{isLogin ? 'Sign in with email' : 'Sign up with email'}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id={isLogin ? 'login-form' : 'signup-form'}>
          {/* Full Name (signup only) */}
          {!isLogin && (
            <div className="ln-auth__field">
              <label className="ln-auth__label" htmlFor="auth-name">Full Name</label>
              <div className="ln-auth__input-wrap">
                <span className="ln-auth__input-icon"><IconUser size={18} /></span>
                <input
                  id="auth-name"
                  type="text"
                  className="ln-auth__input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Muhammad Ahmad"
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="ln-auth__field">
            <label className="ln-auth__label" htmlFor="auth-email">Email address</label>
            <div className="ln-auth__input-wrap">
              <span className="ln-auth__input-icon"><IconMail size={18} /></span>
              <input
                id="auth-email"
                type="email"
                className="ln-auth__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="ln-auth__field">
            <div className="ln-auth__label-row">
              <label className="ln-auth__label" htmlFor="auth-password">Password</label>
              {isLogin && (
                <Link to="/forgot-password" className="ln-auth__forgot" id="auth-forgot-link">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="ln-auth__input-wrap">
              <span className="ln-auth__input-icon"><IconLock size={18} /></span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="ln-auth__input ln-auth__input--password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                required
                minLength={isLogin ? undefined : 6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
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
          </div>

          {/* Confirm Password (signup only) */}
          {!isLogin && (
            <div className="ln-auth__field">
              <label className="ln-auth__label" htmlFor="auth-confirm">Confirm Password</label>
              <div className="ln-auth__input-wrap">
                <span className="ln-auth__input-icon"><IconLock size={18} /></span>
                <input
                  id="auth-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="ln-auth__input ln-auth__input--password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
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
          )}

          {/* Remember me (login only) */}
          {isLogin && (
            <div className="ln-auth__remember">
              <label className="ln-auth__checkbox-label" htmlFor="auth-remember">
                <input
                  type="checkbox"
                  id="auth-remember"
                  className="ln-auth__checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="ln-auth__checkbox-custom" />
                Remember me
              </label>
            </div>
          )}

          {/* Error */}
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

          {/* Submit */}
          <button
            type="submit"
            className="ln-auth__submit"
            disabled={isLoading}
            id={isLogin ? 'login-submit' : 'signup-submit'}
          >
            {isLoading ? (
              <>
                <span className="ln-auth__spinner"><IconLoader size={18} /></span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Switch */}
        <div className="ln-auth__switch">
          {isLogin ? (
            <>Don&apos;t have an account? <Link to="/signup" className="ln-auth__switch-link">Create one</Link></>
          ) : (
            <>Already have an account? <Link to="/login" className="ln-auth__switch-link">Sign in</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
