'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent, flushTrackEvents } from '@/lib/track-event';

export function PublicJourneyTracker() {
  const pathname = usePathname();
  const previous = useRef<string>();
  useEffect(() => {
    if (!pathname || previous.current === pathname) return;
    const referrer = previous.current ?? (() => {
      try { return document.referrer ? new URL(document.referrer).pathname : undefined; }
      catch { return undefined; }
    })();
    trackEvent('page_view', { url: pathname, metadata: { referrer } });
    previous.current = pathname;
    void flushTrackEvents();
  }, [pathname]);
  return null;
}
