import { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminLogin } from '../adminApi';

export default function AdminLogin() {
  const { loginAdmin } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      loginAdmin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login__logo">
          <div className="admin-login__logo-icon">✦</div>
          <h1 className="admin-login__title">Admin Panel</h1>
          <p className="admin-login__subtitle">Islamic Script Generator</p>
        </div>

        {error && <div className="admin-alert admin-alert--error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label className="admin-field__label">Email Address</label>
            <input
              type="email"
              className="admin-field__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>

          <div className="admin-field">
            <label className="admin-field__label">Password</label>
            <input
              type="password"
              className="admin-field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn--primary admin-btn--full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <><div className="admin-spinner" /> Signing in...</>
            ) : (
              '✦ Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
