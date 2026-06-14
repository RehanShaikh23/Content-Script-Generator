import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import EmailComposer from './pages/EmailComposer';
import './admin.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'email', label: 'Email Composer', icon: '✉️' },
];

function AdminPanel() {
  const { admin, logoutAdmin } = useAdminAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailPrefill, setEmailPrefill] = useState(null);

  function handleComposeEmail(user) {
    setEmailPrefill(user);
    setActivePage('email');
  }

  function handleNavClick(id) {
    setActivePage(id);
    setSidebarOpen(false);
    if (id !== 'email') setEmailPrefill(null);
  }

  return (
    <div className="admin-root">
      <div className="admin-layout">
        {/* Mobile Toggle */}
        <button
          className="admin-mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__logo">
              <div className="admin-sidebar__logo-icon">✦</div>
              <div>
                <div className="admin-sidebar__logo-text">Admin Panel</div>
                <span className="admin-sidebar__logo-badge">Islamic Script Generator</span>
              </div>
            </div>
          </div>

          <nav className="admin-sidebar__nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`admin-sidebar__link ${activePage === item.id ? 'admin-sidebar__link--active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="admin-sidebar__link-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-sidebar__user">
              <div className="admin-sidebar__avatar">
                {admin?.fullName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="admin-sidebar__user-info">
                <div className="admin-sidebar__user-name">{admin?.fullName || 'Admin'}</div>
                <div className="admin-sidebar__user-role">Administrator</div>
              </div>
              <button className="admin-sidebar__logout" onClick={logoutAdmin}>
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 45, display: 'none',
            }}
            className="admin-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="admin-main">
          {activePage === 'dashboard' && <AdminDashboard />}
          {activePage === 'users' && <UserManagement onComposeEmail={handleComposeEmail} />}
          {activePage === 'email' && <EmailComposer prefillUser={emailPrefill} />}
        </main>
      </div>
    </div>
  );
}

function AdminGuard() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="admin-root">
        <div className="admin-loading" style={{ minHeight: '100vh' }}>
          <div className="admin-spinner" />
          Loading...
        </div>
      </div>
    );
  }

  if (!admin) return <AdminLogin />;
  return <AdminPanel />;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminGuard />
    </AdminAuthProvider>
  );
}
