// Trello #104 (Pillar 8) — frontend journey tracking.
// Batches UI events and flushes them to POST /v1/track-event so staff actions,
// successes and errors are correlated in the backend audit log. Fire-and-forget:
// failures never disrupt the UI (governanceService.trackEvent swallows errors).
import { governanceService } from '@/lib/services';

type TrackedEvent = {
  event: string;
  entity_type?: string;
  entity_id?: string;
  customer_id?: string;
  metadata?: Record<string, unknown>;
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

/**
 * Record a UI journey event. Common event names:
 * button_clicked · request_started · request_finished · success_toast · error_toast · page_changed
 */
export function trackEvent(event: string, props: Omit<Partial<TrackedEvent>, 'event' | 'occurred_at'> = {}) {
  if (typeof window === 'undefined') return;
  queue.push({
    event,
    ...props,
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
