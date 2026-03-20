import { createContext, useContext, useState, useEffect } from 'react';
import { apiPost, apiGet } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCredits = localStorage.getItem('credits');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setCredits(savedCredits ? parseInt(savedCredits, 10) : 0);
    }
    setLoading(false);
  }, []);

  // Fetch credits from server when token is available
  useEffect(() => {
    if (token) {
      apiGet('/script/credits', token)
        .then(data => {
          setCredits(data.credits);
          localStorage.setItem('credits', String(data.credits));
        })
        .catch(() => {});
    }
  }, [token]);

  function saveAuth(data) {
    setToken(data.token);
    const userData = { fullName: data.fullName, email: data.email };
    setUser(userData);
    setCredits(data.credits);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('credits', String(data.credits));
  }

  function updateCredits(newCredits) {
    setCredits(newCredits);
    localStorage.setItem('credits', String(newCredits));
  }

  async function signup(fullName, email, password) {
    const data = await apiPost('/auth/signup', { fullName, email, password });
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('credits');
  }

  return (
    <AuthContext.Provider value={{ user, token, credits, loading, signup, login, logout, updateCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
