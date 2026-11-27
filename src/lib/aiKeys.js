// Provider preference only — this file deliberately stores NO credentials.
// API keys live exclusively in platform-managed secrets and are read by backend
// functions. Any key previously saved in this browser is purged on load.

const ACTIVE = 'nawah.active';
const LEGACY_KEYS = 'nawah.keys';

try {
  localStorage.removeItem(LEGACY_KEYS);
} catch {
  /* ignore */
}

export function getActive() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVE) || 'null');
    if (raw && raw.provider && raw.model) return raw;
  } catch {
    /* ignore */
  }
  return { provider: 'openai', model: 'gpt-4.1' };
}

export function setActive(provider, model) {
  try {
    localStorage.setItem(ACTIVE, JSON.stringify({ provider, model }));
  } catch {
    /* storage blocked — the choice simply won't persist */
  }
}