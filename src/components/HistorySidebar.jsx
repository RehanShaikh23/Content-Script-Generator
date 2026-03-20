import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../api';
import { useAuth } from '../context/AuthContext';

export default function HistorySidebar({ isOpen, onClose, onSelectScript }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen && token) loadHistory();
  }, [isOpen]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await apiGet('/history', token);
      setHistory(Array.isArray(data) ? data : []);
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
          <h3 className="sidebar__title">✦ Script History</h3>
          <button className="sidebar__close" onClick={onClose}>✕</button>
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
          )}
        </div>
      </aside>
    </>
  );
}
