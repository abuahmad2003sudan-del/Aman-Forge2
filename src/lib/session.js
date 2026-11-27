const KEY = 'nawah.session';
let fallbackKey = '';

function newKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sessionKey() {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const key = newKey();
    localStorage.setItem(KEY, key);
    return key;
  } catch {
    // Storage blocked (private mode, policy): keep one key for this page load so a
    // project created now stays usable until the tab is closed instead of crashing.
    if (!fallbackKey) fallbackKey = newKey();
    return fallbackKey;
  }
}