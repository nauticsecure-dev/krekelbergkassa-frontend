// Trello #104 (Pillar 8) — frontend journey tracking.
// Batches UI events and flushes them to POST /v1/track-event so staff actions,
// successes and errors are correlated in the backend audit log. Fire-and-forget:
// failures never disrupt the UI (governanceService.trackEvent swallows errors).
import { governanceService } from '@/lib/services';
import { getAnonymousSessionId } from '@/lib/session';

type TrackedEvent = {
  event: string;
  entity_type?: string;
  entity_id?: string;
  customer_id?: string;
  metadata?: Record<string, unknown>;
  request_id?: string;
  url?: string;
  route_name?: string;
  intent?: string;
  session_id?: string;
  anonymous_session_id?: string;
  api_method?: string;
  api_endpoint?: string;
  http_status?: number;
  occurred_at: string;
};

let queue: TrackedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  void governanceService.trackEvent(batch);
}

/** Send queued events now. Used by booking so a failure is not waiting on the debounce. */
export function flushTrackEvents() {
  if (typeof window === 'undefined') return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  flush();
}

/**
 * Record a UI journey event. Common event names:
 * button_clicked · request_started · request_finished · success_toast · error_toast · page_changed
 *
 * Journey fields (request_id, url, route_name, intent, session_id,
 * anonymous_session_id, api_method, api_endpoint, http_status) are sent as
 * top-level POST fields. Anything else stays in metadata.
 */
export function trackEvent(event: string, props: Omit<Partial<TrackedEvent>, 'event' | 'occurred_at'> = {}) {
  if (typeof window === 'undefined') return;
  const anonymousSessionId = props.anonymous_session_id || getAnonymousSessionId();
  queue.push({
    event,
    url: window.location.pathname,
    route_name: window.location.pathname,
    ...props,
    ...(anonymousSessionId ? { anonymous_session_id: anonymousSessionId } : {}),
    occurred_at: new Date().toISOString(),
  });
  // Flush soon (debounced) so multiple events in the same interaction batch together.
  if (!timer) timer = setTimeout(flush, 2000);
  // Hard cap so a long session doesn't grow the queue unbounded.
  if (queue.length >= 25) flush();
}

// Best-effort flush when the tab is hidden / unloaded.
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
