import { useState, useEffect } from 'react';
import { getStats, getUsers } from '../adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        getStats(),
        getUsers(0, 5),
      ]);
      setStats(statsData);
      setRecentUsers(usersData.users || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        Loading dashboard...
      </div>
    );
  }

  const statCards = [
    { key: 'totalUsers', label: 'Total Users', icon: '👥', variant: 'total' },
    { key: 'premiumUsers', label: 'Premium', icon: '⭐', variant: 'premium' },
    { key: 'freeUsers', label: 'Free Tier', icon: '🆓', variant: 'free' },
    { key: 'activeSubscriptions', label: 'Active Subs', icon: '✦', variant: 'active' },
    { key: 'cancellingSubscriptions', label: 'Cancelling', icon: '⚠', variant: 'cancelling' },
  ];

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-header__title">Dashboard</h1>
        <p className="admin-page-header__subtitle">Overview of your platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map((card, i) => (
          <div
            key={card.key}
            className={`admin-stat-card admin-stat-card--${card.variant} admin-animate-in`}
          >
            <div className="admin-stat-card__icon">{card.icon}</div>
            <div className="admin-stat-card__label">{card.label}</div>
            <div className="admin-stat-card__value">
              {stats?.[card.key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div className="admin-table-card admin-animate-in" style={{ animationDelay: '0.3s' }}>
        <div className="admin-table-toolbar">
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--admin-text)' }}>
            Recent Signups
          </h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin-table__user-cell">
                    <div className="admin-table__user-avatar">
                      {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="admin-table__user-name">{user.fullName}</div>
                      <div className="admin-table__user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`admin-badge admin-badge--${user.subscriptionTier}`}>
                    {user.subscriptionTier}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge admin-badge--${user.subscriptionStatus === 'ACTIVE' ? 'active' : user.subscriptionStatus === 'CANCELLATION_SCHEDULED' ? 'cancelling' : 'none'}`}>
                    {user.subscriptionStatus === 'CANCELLATION_SCHEDULED' ? 'Cancelling' : user.subscriptionStatus}
                  </span>
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-sec)' }}>
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
