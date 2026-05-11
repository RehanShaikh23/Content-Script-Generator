const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082/api';

/**
 * Stream an SSE endpoint via fetch + ReadableStream.
 * Returns an AbortController so the caller can cancel the stream.
 *
 * @param {string} endpoint - API path (e.g. '/script/generate/stream')
 * @param {object} body - JSON request body
 * @param {string} token - JWT auth token
 * @param {object} handlers - { onChunk(text), onMeta(data), onCached(text), onDone(), onError(err) }
 * @returns {AbortController}
 */
export function apiStream(endpoint, body, token, handlers) {
  const controller = new AbortController();
  const { onChunk, onMeta, onCached, onDone, onError } = handlers;

  (async () => {
    let doneEmitted = false;

    try {
      const headers = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = 'Generation failed';
        try { msg = JSON.parse(text).error || msg; } catch {}
        onError?.(new Error(msg));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE event accumulator
      let eventType = 'message';
      let dataLines = [];

      function dispatchEvent() {
        if (dataLines.length === 0) return;
        const data = dataLines.join('\n');
        dataLines = [];
        const evtName = eventType;
        eventType = 'message'; // reset for next event

        switch (evtName) {
          case 'chunk':
            onChunk?.(data);
            break;
          case 'cached':
            onCached?.(data);
            break;
          case 'meta':
            try { onMeta?.(JSON.parse(data)); } catch {}
            break;
          case 'done':
            if (!doneEmitted) { doneEmitted = true; onDone?.(); }
            break;
          case 'error':
            onError?.(new Error(data));
            break;
          default:
            break;
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line === '' || line === '\r') {
            // Blank line = event boundary → dispatch accumulated event
            dispatchEvent();
          } else if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            // Preserve whitespace — don't trim! Spaces are content.
            dataLines.push(line.slice(5));
          }
          // Ignore comments (lines starting with ':') and other fields
        }
      }

      // Flush any remaining buffered event
      dispatchEvent();

      // If we exited the loop without a done event, signal completion
      if (!doneEmitted) { doneEmitted = true; onDone?.(); }

    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled — not an error
        return;
      }
      onError?.(err);
    }
  })();

  return controller;
}

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

/**
 * Download a binary file (PDF, DOCX) from a POST endpoint.
 * Returns a Blob that can be used with URL.createObjectURL.
 */
export async function apiDownload(endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot connect to server. Is the backend running?');
  }

  if (!res.ok) {
    // Try to parse error as JSON
    const text = await res.text();
    let msg = 'Export failed';
    try {
      const data = JSON.parse(text);
      msg = data.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return await res.blob();
}
