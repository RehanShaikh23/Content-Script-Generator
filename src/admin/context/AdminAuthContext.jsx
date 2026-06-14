import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedAdmin = localStorage.getItem('admin_user');
    if (savedToken && savedAdmin) {
      setToken(savedToken);
      setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  function loginAdmin(data) {
    setToken(data.token);
    const adminData = { fullName: data.fullName, email: data.email };
    setAdmin(adminData);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(adminData));
  }

  function logoutAdmin() {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, loginAdmin, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
