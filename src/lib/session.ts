const ANONYMOUS_SESSION_KEY = 'krek_anonymous_session_id';
const ANONYMOUS_SESSION_PATTERN = /^anon_[A-Za-z0-9_-]{8,75}$/;

function createAnonymousSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `anon_${crypto.randomUUID().replace(/-/g, '')}`;
    }
  } catch {
    /* fall through */
  }
  return `anon_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable id for this browser tab session. Created once and reused so later
 * login can attach pre-login journey events to the user.
 */
export function getAnonymousSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const existing = window.localStorage.getItem(ANONYMOUS_SESSION_KEY);
    if (existing && ANONYMOUS_SESSION_PATTERN.test(existing)) return existing;

    const created = createAnonymousSessionId();
    window.localStorage.setItem(ANONYMOUS_SESSION_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

export function getJourneySessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let id = window.sessionStorage.getItem('krek_journey_session');
    if (!id) {
      id = `sess_${createAnonymousSessionId().slice(5)}`;
      window.sessionStorage.setItem('krek_journey_session', id);
    }
    return id;
  } catch { return undefined; }
}

// Separate from the public anonymous ID. Only its SHA-256 hash is persisted
// server-side, and neither the secret nor its hash appears in audit resources.
export function getJourneyKey(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let key = window.localStorage.getItem('krek_journey_key');
    if (!key || !/^[a-f0-9]{64}$/.test(key)) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem('krek_journey_key', key);
    }
    return key;
  } catch { return undefined; }
}

export function resetJourneyIdentity() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ANONYMOUS_SESSION_KEY);
    window.localStorage.removeItem('krek_journey_key');
    window.sessionStorage.removeItem('krek_journey_session');
  } catch { /* Storage can be disabled. */ }
}
