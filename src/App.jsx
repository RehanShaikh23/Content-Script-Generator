import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import ScriptForm from './components/ScriptForm';
import CreatorTips from './components/CreatorTips';
import ContentCalendarPlanner from './components/ContentCalendarPlanner';
import Footer from './components/Footer';
import ReportIssueModal from './components/ReportIssueModal';
import DailyReminderModal from './components/DailyReminderModal';
import HistorySidebar from './components/HistorySidebar';
import SubscriptionModal from './components/SubscriptionModal';
import CancelSubscriptionModal from './components/CancelSubscriptionModal';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function ProtectedApp() {
  const {
    user, loading, logout, credits, subscriptionTier, subscriptionStatus,
    isPremium, isCancellationScheduled, hasPaidPlan, accessEndDate
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Listen for upgrade event from ScriptForm
  useEffect(() => {
    const handler = () => setShowPricing(true);
    window.addEventListener('openPricingModal', handler);
    return () => window.removeEventListener('openPricingModal', handler);
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Format access end date for the user bar
  const formattedEndDate = accessEndDate
    ? new Date(accessEndDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : null;

  return (
    <div className="app-wrapper">
      <HistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectScript={(item) => { setSelectedScript(item); setShowCalendar(false); }}
        credits={credits}
        isPremium={isPremium}
        subscriptionTier={subscriptionTier}
        hasPaidPlan={hasPaidPlan}
        isCancellationScheduled={isCancellationScheduled}
        accessEndDate={accessEndDate}
        showCalendar={showCalendar}
        onLogout={logout}
        onUpgrade={() => setShowPricing(true)}
        onReportIssue={() => setShowReport(true)}
        onCalendar={() => { setSidebarOpen(false); setShowCalendar(true); }}
        onManageSubscription={() => setShowCancelModal(true)}
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
            {/* Credits — show ∞ for premium */}
            <span className="user-bar__credits" title={isPremium ? 'Unlimited credits' : 'Credits remaining'}>
              ✦ {isPremium ? '∞' : credits} {!isPremium && credits !== 1 ? 'credits' : isPremium ? '' : 'credit'}
            </span>

            <button className="user-bar__report-btn" onClick={() => setShowReport(true)} title="Report an Issue">
              ⚑ Report
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
          onCancelSubscription={() => setShowCancelModal(true)}
        />
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
        />
        {showCalendar ? (
          <ContentCalendarPlanner />
        ) : (
          <>
            <ScriptForm
              selectedScript={selectedScript}
              onScriptGenerated={() => setSelectedScript(null)}
            />
            <CreatorTips />
          </>
        )}
        <Footer onReportIssue={() => setShowReport(true)} />
        <ReportIssueModal isOpen={showReport} onClose={() => setShowReport(false)} />
        <DailyReminderModal />
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
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
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
