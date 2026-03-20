import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import ScriptForm from './components/ScriptForm';
import Footer from './components/Footer';
import HistorySidebar from './components/HistorySidebar';
import SubscriptionModal from './components/SubscriptionModal';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function ProtectedApp() {
  const { user, loading, logout, credits } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [showPricing, setShowPricing] = useState(false);

  // Listen for upgrade event from ScriptForm
  useEffect(() => {
    const handler = () => setShowPricing(true);
    window.addEventListener('openPricingModal', handler);
    return () => window.removeEventListener('openPricingModal', handler);
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-wrapper">
      <HistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectScript={(item) => setSelectedScript(item)}
      />

      <div className="app-container">
        <div className="user-bar">
          <div className="user-bar__left">
            <button
              className="user-bar__history-btn"
              onClick={() => setSidebarOpen(true)}
              title="Script History"
            >
              ☰
            </button>
            <span className="user-bar__greeting">
              Assalamu Alaikum, <strong>{user.fullName}</strong>
            </span>
          </div>
          <div className="user-bar__right">
            <span className="user-bar__credits" title="Credits remaining">
              ✦ {credits} credit{credits !== 1 ? 's' : ''}
            </span>
            <button className="user-bar__upgrade" onClick={() => setShowPricing(true)}>
              ✦ Upgrade
            </button>
            <button className="user-bar__logout" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
        <Header />
        <SubscriptionModal
          isOpen={showPricing}
          onClose={() => setShowPricing(false)}
        />
        <ScriptForm
          selectedScript={selectedScript}
          onScriptGenerated={() => setSelectedScript(null)}
        />
        <Footer />
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          <Route path="/" element={<ProtectedApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
