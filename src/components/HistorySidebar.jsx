import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../api';
import { useAuth } from '../context/AuthContext';

export default function HistorySidebar({ isOpen, onClose, onSelectScript, credits, isPremium, subscriptionTier, hasPaidPlan, isCancellationScheduled, accessEndDate, showCalendar, onLogout, onUpgrade, onReportIssue, onCalendar, onManageSubscription }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(-1);
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen && token) loadHistory();
  }, [isOpen]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await apiGet('/history', token);
      // Handle both old (array) and new (object) response formats
      if (Array.isArray(data)) {
        setHistory(data);
        setTotal(data.length);
      } else {
        setHistory(Array.isArray(data.history) ? data.history : []);
        setTotal(data.total || 0);
        setHistoryLimit(data.limit ?? -1);
      }
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      await apiDelete(`/history/${id}`, token);
      setHistory(prev => prev.filter(h => h.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function truncate(text, len = 80) {
    if (!text) return '';
    return text.length > len ? text.substring(0, len) + '…' : text;
  }

  // Format access end date
  const formattedEndDate = accessEndDate
    ? new Date(accessEndDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar__header">
          <h3 className="sidebar__title">
            ✦ Script History
            {isPremium && <span className="sidebar__premium-tag">∞</span>}
          </h3>
          <button className="sidebar__close" onClick={onClose}>✕</button>
        </div>

        {/* ── Navigation Section ── */}
        <div className="sidebar__nav">
          {/* Plan Badge */}
          {isPremium && !isCancellationScheduled ? (
            <div className="sidebar__nav-badge sidebar__nav-badge--premium">
              ⚡ Premium Active
            </div>
          ) : isCancellationScheduled ? (
            <div className="sidebar__nav-badge sidebar__nav-badge--cancelling">
              ⏳ Ends {formattedEndDate || 'soon'}
            </div>
          ) : (
            subscriptionTier && subscriptionTier !== 'free' && (
              <div className="sidebar__nav-badge">
                ☪ {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}
              </div>
            )
          )}

          {/* Manage Plan / Upgrade */}
          {hasPaidPlan ? (
            <button className="sidebar__nav-btn" onClick={() => { onClose(); onUpgrade(); }}>
              <span className="sidebar__nav-icon">☰</span>
              <span className="sidebar__nav-label">Manage Plan</span>
              <span className="sidebar__nav-arrow">→</span>
            </button>
          ) : (
            <button className="sidebar__nav-btn sidebar__nav-btn--upgrade" onClick={() => { onClose(); onUpgrade(); }}>
              <span className="sidebar__nav-icon">✦</span>
              <span className="sidebar__nav-label">Upgrade Plan</span>
              <span className="sidebar__nav-arrow">→</span>
            </button>
          )}

          {/* Calendar Planner Nav */}
          <button className={`sidebar__nav-btn ${showCalendar ? 'sidebar__nav-btn--active' : ''}`} onClick={onCalendar}>
            <span className="sidebar__nav-icon">📅</span>
            <span className="sidebar__nav-label">Content Calendar</span>
            <span className="sidebar__nav-arrow">→</span>
          </button>
        </div>

        <div className="sidebar__content">
          {loading ? (
            <div className="sidebar__empty">Loading…</div>
          ) : history.length === 0 ? (
            <div className="sidebar__empty">
              <span className="sidebar__empty-icon">📜</span>
              <p>No scripts yet</p>
              <p className="sidebar__empty-hint">Generated scripts will appear here</p>
            </div>
          ) : (
            <>
              {/* History limit indicator for free users */}
              {!isPremium && historyLimit > 0 && total > historyLimit && (
                <div className="sidebar__limit-notice">
                  Showing {historyLimit} of {total} scripts.
                  <button
                    className="sidebar__limit-upgrade"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new Event('openPricingModal'));
                    }}
                  >
                    Upgrade for unlimited
                  </button>
                </div>
              )}

              <div className="sidebar__list">
                {history.map(item => (
                  <div
                    key={item.id}
                    className="history-item"
                    onClick={() => {
                      onSelectScript(item);
                      onClose();
                    }}
                  >
                    <div className="history-item__top">
                      <span className="history-item__topic">{item.topic}</span>
                      <button
                        className="history-item__delete"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                    <div className="history-item__meta">
                      <span className="history-item__tag">{item.videoFormat}</span>
                      <span className="history-item__tag">{item.category}</span>
                      <span className="history-item__time">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="history-item__preview">
                      {truncate(item.script)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
