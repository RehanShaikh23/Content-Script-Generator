const API_BASE = 'http://localhost:8082/api';

export async function apiPost(endpoint, body, token, method = 'POST') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (networkError) {
    throw new Error('Cannot connect to server. Is the backend running?');
  }

  // Handle empty responses (e.g. Spring Security 401/403)
  const text = await res.text();
  if (!text) {
    if (res.status === 401) throw new Error('Session expired. Please log in again.');
    if (res.status === 403) throw new Error('Access denied.');
    if (res.ok) return {};
    throw new Error(`Server returned empty response (${res.status})`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}

export async function apiDelete(endpoint, token) {
  return apiPost(endpoint, null, token, 'DELETE');
}

export async function apiGet(endpoint, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { headers });
  } catch {
    throw new Error('Cannot connect to server. Is the backend running?');
  }

  const text = await res.text();
  if (!text) {
    if (res.status === 401) throw new Error('Session expired. Please log in again.');
    throw new Error(`Server returned empty response (${res.status})`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}
