// Trello #104 (Pillar 8) — frontend journey tracking.
// Batches UI events and flushes them to POST /v1/track-event so staff actions,
// successes and errors are correlated in the backend audit log. Fire-and-forget:
// failures never disrupt the UI; bounded retries preserve stable event IDs.
import { governanceService } from '@/lib/services';
import { getAnonymousSessionId, getJourneySessionId } from '@/lib/session';
import { journeyIntent } from '@/lib/journey-intent';

type TrackedEvent = {
  event_id?: string;
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
  location_id?: string;
  occurred_at: string;
};

type QueuedEvent = TrackedEvent & { attempts: number };
let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

export function discardQueuedTrackEvents() {
  queue = [];
  if (timer) clearTimeout(timer);
  timer = null;
}

function flush(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (inFlight) return inFlight;
  if (!queue.length) return Promise.resolve();
  // Logout in another tab can rotate the browser identity while a retry is
  // queued. Never attribute that old batch to the next signed-in customer.
  queue = queue.filter((item) => item.anonymous_session_id === getAnonymousSessionId());
  const batch = queue.splice(0, 25);
  if (!batch.length) return Promise.resolve();
  inFlight = (async () => {
    try {
      await governanceService.trackEvent(batch.map((item) => {
        const event: Partial<QueuedEvent> = { ...item };
        delete event.attempts;
        return event;
      }));
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const retryable = !status || status >= 500 || status === 408 || status === 429;
      const retry = retryable ? batch.filter((item) => item.event_id && item.attempts < 2)
        .map((item) => ({ ...item, attempts: item.attempts + 1 })) : [];
      queue = [...retry, ...queue].slice(0, 100);
      console.warn('Journey events could not be persisted', { count: batch.length, retrying: retry.length, status });
    } finally {
      inFlight = null;
      if (queue.length && !timer) timer = setTimeout(() => void flush(), 2000);
    }
  })();
  return inFlight;
}

/** Send queued events now. Used by booking so a failure is not waiting on the debounce. */
export function flushTrackEvents() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return flush();
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
    attempts: 0,
    event_id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : undefined,
    event,
    url: window.location.pathname,
    route_name: window.location.pathname,
    intent: journeyIntent(window.location.pathname),
    session_id: getJourneySessionId(),
    ...props,
    http_status: props.http_status && props.http_status >= 100 ? props.http_status : undefined,
    ...(anonymousSessionId ? { anonymous_session_id: anonymousSessionId } : {}),
    occurred_at: new Date().toISOString(),
  });
  queue = queue.slice(-100);
  // Flush soon (debounced) so multiple events in the same interaction batch together.
  if (!timer) timer = setTimeout(() => void flush(), 2000);
  // Hard cap so a long session doesn't grow the queue unbounded.
  if (queue.length >= 25) void flush();
}

// Best-effort flush when the tab is hidden / unloaded.
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
