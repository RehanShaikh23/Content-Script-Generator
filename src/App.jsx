import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import StudioLayout from './components/studio/StudioLayout';
import ScriptForm from './components/ScriptForm';
import CreatorTips from './components/CreatorTips';
import ContentCalendarPlanner from './components/ContentCalendarPlanner';

import ReportIssueModal from './components/ReportIssueModal';
import DailyReminderModal from './components/DailyReminderModal';
import HistorySidebar from './components/HistorySidebar';
import SubscriptionModal from './components/SubscriptionModal';
import CancelSubscriptionModal from './components/CancelSubscriptionModal';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';


const AdminApp = lazy(() => import('./admin/AdminApp'));

function ProtectedApp({ preview = false }) {
  const {
    user: signedInUser, loading, logout, credits: actualCredits, subscriptionTier,
    isPremium, isCancellationScheduled, hasPaidPlan, accessEndDate
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [workspaceTab, setWorkspaceTab] = useState('script');

  // Listen for upgrade event from ScriptForm
  useEffect(() => {
    const handler = () => setShowPricing(true);
    window.addEventListener('openPricingModal', handler);
    return () => window.removeEventListener('openPricingModal', handler);
  }, []);

  const user = preview ? { fullName: 'Creator' } : signedInUser;
  const credits = preview ? 5 : actualCredits;
  if (loading && !preview) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <StudioLayout user={user} credits={credits} isPremium={isPremium} hasPaidPlan={hasPaidPlan} tab={workspaceTab} onTab={tab => { setWorkspaceTab(tab); setShowCalendar(false); }} showCalendar={showCalendar} onCalendar={() => setShowCalendar(true)} onHistory={() => setSidebarOpen(true)} onUpgrade={() => setShowPricing(true)} onReport={() => setShowReport(true)} onLogout={logout} preview={preview}>
      <HistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectScript={(item) => { setSelectedScript(item); setShowCalendar(false); setWorkspaceTab('script'); }}
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
            <ScriptForm preview={preview} workspaceTab={workspaceTab} onWorkspaceTab={setWorkspaceTab}
              selectedScript={selectedScript}
              onScriptGenerated={() => setSelectedScript(null)}
            />
            <CreatorTips />
          </>
        )}
        <ReportIssueModal isOpen={showReport} onClose={() => setShowReport(false)} />
        {!preview && <DailyReminderModal />}
    </StudioLayout>
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
          {import.meta.env.DEV && <Route path="/design-preview" element={<ProtectedApp preview />} />}
          <Route path="/admin/*" element={
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0D11', color: '#8B8FA3', fontFamily: 'Inter, sans-serif' }}>Loading admin panel...</div>}>
              <AdminApp />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
