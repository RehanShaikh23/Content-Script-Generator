import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { useVisualScenes } from '../src/hooks/useVisualScenes.js';
import { apiPost } from '../src/api.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalFetch = globalThis.fetch;
let renderer;
let current;
const script = Array.from({ length: 8 }, (_, i) =>
  `**Scene ${i + 1}**\nThis is a scene with enough narration words to form a complete visual direction request.`).join('\n\n');
function Harness({ token }) { current = useVisualScenes(token); return null; }
async function mount(token = 'test-token') {
  await act(async () => { renderer = create(React.createElement(Harness, { token })); });
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = null;
  globalThis.fetch = originalFetch;
});

test('profile 401 stops all scene requests and surfaces the session error', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response('{"error":"Unauthorized"}', { status: 401 });
  };
  await mount();
  await act(async () => current.startVisualGeneration(script, 'Topic'));
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /profile$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.match(current.error, /sign in again/);
  assert.equal(current.isProcessing, false);
  assert.ok(Object.values(current.sceneStates).every(s => s.status === 'failed'));
});

test('no token means no network requests', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected request'); };
  await mount(null);
  await act(async () => current.startVisualGeneration(script, 'Topic'));
  assert.equal(calls, 0);
  assert.match(current.error, /sign in/);
});

test('scene 401 stops the queue after at most three concurrent requests', async () => {
  let scenes = 0;
  globalThis.fetch = async url => {
    if (url.endsWith('/profile')) return Response.json({ globalVisualProfile: {} });
    scenes++;
    return new Response('', { status: 401 });
  };
  await mount();
  await act(async () => current.startVisualGeneration(script, 'Topic'));
  assert.equal(scenes, 3);
  assert.equal(current.isProcessing, false);
  assert.ok(Object.values(current.sceneStates).every(s => s.status === 'failed'));
});

test('cancel during profile fetch aborts the actual request and starts no scenes', async () => {
  let signal;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    started();
  });
  await mount();
  let running;
  await act(async () => { running = current.startVisualGeneration(script, 'Topic'); await ready; });
  await act(async () => { current.cancelGeneration(); await running; });
  assert.equal(signal.aborted, true);
  assert.equal(current.isProcessing, false);
  assert.equal(current.isProfileLoading, false);
  assert.ok(Object.values(current.sceneStates).every(s => s.status === 'cancelled'));
});

test('API preserves status and AbortError for orchestration', async () => {
  globalThis.fetch = async () => new Response('{"error":"Slow down"}', { status: 429 });
  await assert.rejects(apiPost('/test', {}, 'token'), e => e.status === 429);
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
  await assert.rejects(apiPost('/test', {}, 'token'), e => e.name === 'AbortError');
});

test('non-auth profile failure retains fallback and updated token is used', async () => {
  const tokens = [];
  let sceneCount = 0;
  globalThis.fetch = async (url, options) => {
    tokens.push(options.headers.Authorization);
    if (url.endsWith('/profile')) return new Response('', { status: 500 });
    sceneCount++;
    return Response.json({ sceneId: JSON.parse(options.body).sceneId });
  };
  await mount('old-token');
  await act(async () => renderer.update(React.createElement(Harness, { token: 'new-token' })));
  await act(async () => current.startVisualGeneration(script, 'Topic'));
  assert.equal(sceneCount, current.scenes.length);
  assert.ok(tokens.every(t => t === 'Bearer new-token'));
  assert.ok(Object.values(current.sceneStates).every(s => s.status === 'completed'));
  assert.equal(current.isProcessing, false);
});

test('login failures retain the server message rather than claiming an expired session', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Invalid credentials' }, { status: 401 });
  await assert.rejects(apiPost('/auth/login', {}), e => e.status === 401 && e.message === 'Invalid credentials');
});
