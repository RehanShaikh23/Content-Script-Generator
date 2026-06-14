const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082/api';

async function adminFetch(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const text = await res.text();

  if (!text) {
    if (res.status === 401) throw new Error('Session expired. Please log in again.');
    if (res.status === 403) throw new Error('Admin access required.');
    if (res.ok) return {};
    throw new Error(`Server returned empty response (${res.status})`);
  }

  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.substring(0, 100)}`); }
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong');
  return data;
}

// ── Dashboard ───────────────────────────────────────────────────
export const getStats = () => adminFetch('/admin/stats');

// ── Users ───────────────────────────────────────────────────────
export const getUsers = (page = 0, size = 20, search = '', tier = '', status = '') => {
  const params = new URLSearchParams({ page, size });
  if (search) params.set('search', search);
  if (tier) params.set('tier', tier);
  if (status) params.set('status', status);
  return adminFetch(`/admin/users?${params}`);
};

export const getUserById = (id) => adminFetch(`/admin/users/${id}`);

export const updateSubscription = (id, body) =>
  adminFetch(`/admin/users/${id}/subscription`, { method: 'PUT', body: JSON.stringify(body) });

export const updateCredits = (id, credits) =>
  adminFetch(`/admin/users/${id}/credits`, { method: 'PUT', body: JSON.stringify({ credits }) });

// ── Email ───────────────────────────────────────────────────────
export const draftEmail = (recipientName, recipientEmail, context, tone) =>
  adminFetch('/admin/email/draft', {
    method: 'POST',
    body: JSON.stringify({ recipientName, recipientEmail, context, tone }),
  });

export const sendEmail = (toEmail, toName, subject, htmlBody) =>
  adminFetch('/admin/email/send', {
    method: 'POST',
    body: JSON.stringify({ toEmail, toName, subject, htmlBody }),
  });

// ── Auth ────────────────────────────────────────────────────────
export const adminLogin = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  if (!text) throw new Error('Server returned empty response');

  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid response from server'); }
  if (!res.ok) throw new Error(data.error || 'Invalid email or password');
  if (!data.admin) throw new Error('This account does not have admin access');

  return data;
};
