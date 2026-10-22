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
    const existing = window.sessionStorage.getItem(ANONYMOUS_SESSION_KEY);
    if (existing && ANONYMOUS_SESSION_PATTERN.test(existing)) return existing;

    const created = createAnonymousSessionId();
    window.sessionStorage.setItem(ANONYMOUS_SESSION_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}
