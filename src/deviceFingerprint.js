/**
 * Device Fingerprint Utility
 * 
 * Generates a stable, privacy-friendly device identifier by combining:
 * 1. A persistent random seed stored in localStorage
 * 2. Browser signals (userAgent, screen, timezone, etc.)
 * 
 * The result is SHA-256 hashed so no raw fingerprint data leaves the client.
 * Used to enforce a per-device account creation limit.
 */

const STORAGE_KEY = '_did_seed';

/**
 * Get or create a persistent random seed in localStorage.
 * If localStorage is unavailable (private browsing, etc.), returns a session-only fallback.
 */
function getPersistentSeed() {
  try {
    let seed = localStorage.getItem(STORAGE_KEY);
    if (!seed) {
      seed = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, seed);
    }
    return seed;
  } catch {
    // localStorage blocked — generate a session-only seed
    return crypto.randomUUID();
  }
}

/**
 * Collect stable browser signals for fingerprinting.
 * These signals rarely change between page loads on the same device.
 */
function collectBrowserSignals() {
  const signals = [
    navigator.userAgent || '',
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
    `${navigator.hardwareConcurrency || 0}`,
    navigator.platform || '',
  ];
  return signals.join('|');
}

/**
 * Hash a string using SHA-256 via the Web Crypto API.
 * Returns the hex-encoded digest.
 */
async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a stable, hashed device identifier.
 * 
 * @returns {Promise<string>} SHA-256 hex string (64 characters)
 */
export async function getDeviceId() {
  const seed = getPersistentSeed();
  const signals = collectBrowserSignals();
  const raw = `${seed}::${signals}`;
  return sha256(raw);
}
