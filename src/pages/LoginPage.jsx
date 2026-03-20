import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="header">
          <span className="header__ornament">✦ ☽ ✦</span>
          <div className="header__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="header__title">Welcome Back</h1>
          <p className="header__subtitle">Sign in to continue to the Islamic Script Generator</p>
        </div>

        <div className="card auth-card">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="field">
              <label className="field__label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="generate-btn auth-btn"
              disabled={isLoading}
            >
              {isLoading ? '⟳ Signing in…' : '✦ Sign In ✦'}
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Create one</Link>
          </div>
        </div>

        <div className="footer">
          آمين — May Allah make your content a sadaqah jaariyah
        </div>
      </div>
    </div>
  );
}
