import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateSubscription, updateCredits } from '../adminApi';
import SubscriptionManager from './SubscriptionManager';

export default function UserManagement({ onComposeEmail }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers(page, 15, search, tierFilter, statusFilter);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, tierFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function showAlert(type, message) {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }

  async function handleSubscriptionUpdate(userId, body) {
    try {
      await updateSubscription(userId, body);
      showAlert('success', `Subscription updated successfully`);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      showAlert('error', err.message);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const filters = [
    { label: 'All', tier: '', status: '' },
    { label: 'Free', tier: 'free', status: '' },
    { label: 'Premium', tier: 'premium', status: '' },
    { label: 'Active', tier: '', status: 'ACTIVE' },
    { label: 'Cancelling', tier: '', status: 'CANCELLATION_SCHEDULED' },
  ];

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-header__title">User Management</h1>
        <p className="admin-page-header__subtitle">
          {totalElements} total user{totalElements !== 1 ? 's' : ''}
        </p>
      </div>

      {alert && (
        <div className={`admin-alert admin-alert--${alert.type}`}>
          {alert.type === 'success' ? '✓' : '⚠'} {alert.message}
        </div>
      )}

      <div className="admin-table-card">
        {/* Toolbar */}
        <div className="admin-table-toolbar">
          <div className="admin-search-wrap">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="admin-filter-chips">
            {filters.map((f) => (
              <button
                key={f.label}
                className={`admin-filter-chip ${tierFilter === f.tier && statusFilter === f.status ? 'admin-filter-chip--active' : ''}`}
                onClick={() => { setTierFilter(f.tier); setStatusFilter(f.status); setPage(0); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty__icon">👥</div>
            <div className="admin-empty__text">No users found</div>
            <div className="admin-empty__hint">Try adjusting your search or filters</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Credits</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {user.credits >= 999999 ? '∞' : user.credits}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-sec)' }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => setSelectedUser(user)}
                        title="Manage subscription"
                      >
                        ⚙ Manage
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--email"
                        onClick={() => onComposeEmail?.(user)}
                        title="Send email"
                      >
                        ✉ Email
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <div className="admin-pagination__info">
              Page {page + 1} of {totalPages}
            </div>
            <div className="admin-pagination__buttons">
              <button
                className="admin-pagination__btn"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pageNum = startPage + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    className={`admin-pagination__btn ${pageNum === page ? 'admin-pagination__btn--active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                className="admin-pagination__btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Manager Modal */}
      {selectedUser && (
        <SubscriptionManager
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleSubscriptionUpdate}
        />
      )}
    </>
  );
}
