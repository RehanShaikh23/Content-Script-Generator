import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiPost, apiGet } from '../api';
import { getDeviceId } from '../deviceFingerprint';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [credits, setCredits] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('NONE');
  const [accessEndDate, setAccessEndDate] = useState(null);
  const [cancellationScheduledAt, setCancellationScheduledAt] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derived premium status — single source of truth
  const isPremium = subscriptionTier === 'premium' &&
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'CANCELLATION_SCHEDULED');

  // Derived cancellation status
  const isCancellationScheduled = subscriptionStatus === 'CANCELLATION_SCHEDULED';

  // Check if user has any active paid plan (including cancellation-scheduled)
  const hasPaidPlan = subscriptionTier !== 'free' &&
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'CANCELLATION_SCHEDULED');

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCredits = localStorage.getItem('credits');
    const savedTier = localStorage.getItem('subscriptionTier');
    const savedStatus = localStorage.getItem('subscriptionStatus');
    const savedEndDate = localStorage.getItem('accessEndDate');
    const savedCancelAt = localStorage.getItem('cancellationScheduledAt');
    const savedSubId = localStorage.getItem('subscriptionId');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setCredits(savedCredits ? parseInt(savedCredits, 10) : 0);
      setSubscriptionTier(savedTier || 'free');
      setSubscriptionStatus(savedStatus || 'NONE');
      setAccessEndDate(savedEndDate || null);
      setCancellationScheduledAt(savedCancelAt || null);
      setSubscriptionId(savedSubId || null);
    }
    setLoading(false);
  }, []);

  // Fetch credits + subscription status from server when token is available
  useEffect(() => {
    if (token) {
      apiGet('/script/credits', token)
        .then(data => {
          setCredits(data.credits);
          localStorage.setItem('credits', String(data.credits));
        })
        .catch(() => {});

      apiGet('/subscription/status', token)
        .then(data => {
          setSubscriptionTier(data.tier || 'free');
          setSubscriptionStatus(data.status || 'NONE');
          setCredits(data.credits);
          setAccessEndDate(data.accessEndDate || null);
          setCancellationScheduledAt(data.cancellationScheduledAt || null);
          setSubscriptionId(data.subscriptionId || null);
          localStorage.setItem('subscriptionTier', data.tier || 'free');
          localStorage.setItem('subscriptionStatus', data.status || 'NONE');
          localStorage.setItem('credits', String(data.credits));
          if (data.accessEndDate) localStorage.setItem('accessEndDate', data.accessEndDate);
          else localStorage.removeItem('accessEndDate');
          if (data.cancellationScheduledAt) localStorage.setItem('cancellationScheduledAt', data.cancellationScheduledAt);
          else localStorage.removeItem('cancellationScheduledAt');
          if (data.subscriptionId) localStorage.setItem('subscriptionId', data.subscriptionId);
          else localStorage.removeItem('subscriptionId');
        })
        .catch(() => {});
    }
  }, [token]);

  function saveAuth(data) {
    setToken(data.token);
    const userData = { fullName: data.fullName, email: data.email };
    setUser(userData);
    setCredits(data.credits);
    setSubscriptionTier(data.subscriptionTier || 'free');
    setSubscriptionStatus(data.subscriptionStatus || 'NONE');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('credits', String(data.credits));
    localStorage.setItem('subscriptionTier', data.subscriptionTier || 'free');
    localStorage.setItem('subscriptionStatus', data.subscriptionStatus || 'NONE');
  }

  function updateCredits(newCredits) {
    setCredits(newCredits);
    localStorage.setItem('credits', String(newCredits));
  }

  /**
   * Instantly update subscription state after successful activation.
   * Avoids waiting for a server round-trip — makes the UI feel instant.
   */
  function updateSubscription(tier, status, newCredits, endDate, cancelAt, subId) {
    setSubscriptionTier(tier);
    setSubscriptionStatus(status);
    if (newCredits !== undefined) {
      setCredits(newCredits);
      localStorage.setItem('credits', String(newCredits));
    }
    localStorage.setItem('subscriptionTier', tier);
    localStorage.setItem('subscriptionStatus', status);

    // Handle cancellation-related fields
    if (endDate !== undefined) {
      setAccessEndDate(endDate);
      if (endDate) localStorage.setItem('accessEndDate', endDate);
      else localStorage.removeItem('accessEndDate');
    }
    if (cancelAt !== undefined) {
      setCancellationScheduledAt(cancelAt);
      if (cancelAt) localStorage.setItem('cancellationScheduledAt', cancelAt);
      else localStorage.removeItem('cancellationScheduledAt');
    }
    if (subId !== undefined) {
      setSubscriptionId(subId);
      if (subId) localStorage.setItem('subscriptionId', subId);
      else localStorage.removeItem('subscriptionId');
    }
  }

  /**
   * Refresh subscription status from the server.
   * Call this after a successful PayPal subscription activation.
   */
  const refreshSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet('/subscription/status', token);
      setSubscriptionTier(data.tier || 'free');
      setSubscriptionStatus(data.status || 'NONE');
      setCredits(data.credits);
      setAccessEndDate(data.accessEndDate || null);
      setCancellationScheduledAt(data.cancellationScheduledAt || null);
      setSubscriptionId(data.subscriptionId || null);
      localStorage.setItem('subscriptionTier', data.tier || 'free');
      localStorage.setItem('subscriptionStatus', data.status || 'NONE');
      localStorage.setItem('credits', String(data.credits));
      if (data.accessEndDate) localStorage.setItem('accessEndDate', data.accessEndDate);
      else localStorage.removeItem('accessEndDate');
      if (data.cancellationScheduledAt) localStorage.setItem('cancellationScheduledAt', data.cancellationScheduledAt);
      else localStorage.removeItem('cancellationScheduledAt');
      if (data.subscriptionId) localStorage.setItem('subscriptionId', data.subscriptionId);
      else localStorage.removeItem('subscriptionId');
    } catch (e) {
      console.error('Failed to refresh subscription:', e);
    }
  }, [token]);

  async function signup(fullName, email, password) {
    const deviceId = await getDeviceId();
    const data = await apiPost('/auth/signup', { fullName, email, password, deviceId });
    saveAuth(data);
    return data;
  }

  async function login(email, password) {
    const data = await apiPost('/auth/login', { email, password });
    saveAuth(data);
    return data;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCredits(0);
    setSubscriptionTier('free');
    setSubscriptionStatus('NONE');
    setAccessEndDate(null);
    setCancellationScheduledAt(null);
    setSubscriptionId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('credits');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('subscriptionStatus');
    localStorage.removeItem('accessEndDate');
    localStorage.removeItem('cancellationScheduledAt');
    localStorage.removeItem('subscriptionId');
  }

  return (
    <AuthContext.Provider value={{
      user, token, credits, subscriptionTier, subscriptionStatus,
      accessEndDate, cancellationScheduledAt, subscriptionId,
      isPremium, isCancellationScheduled, hasPaidPlan,
      loading, signup, login, logout, updateCredits,
      updateSubscription, refreshSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
