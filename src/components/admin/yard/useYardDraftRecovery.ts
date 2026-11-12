'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function useYardDraftRecovery<T>(snapshot: T | undefined, validate: (value: unknown) => value is T) {
  const { user } = useAuth();
  const key = user?.id ? `werfcanvas.draft.${user.id}` : undefined;
  const [recovered, setRecovered] = useState<T>();
  const written = useRef(false);
  const serialized = snapshot ? JSON.stringify(snapshot) : undefined;
  useEffect(() => {
    written.current = false;
    setRecovered(undefined);
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.at === 'number' && Date.now() - saved.at < 7 * 86400000 && validate(saved.value)) setRecovered(saved.value);
      else sessionStorage.removeItem(key);
    } catch { /* Draft recovery is optional when storage is disabled. */ }
    // Validation describes the persisted schema; only account changes reload storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!key) return;
    if (!serialized) {
      if (written.current) {
        try { sessionStorage.removeItem(key); } catch { /* Storage unavailable. */ }
        written.current = false;
      }
      return;
    }
    const timer = setTimeout(() => {
      try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value: JSON.parse(serialized) })); written.current = true; }
      catch { /* The normal unsaved-edit warning remains available. */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [key, serialized]);
  const discard = () => {
    if (key) { try { sessionStorage.removeItem(key); } catch { /* Storage unavailable. */ } }
    written.current = false;
    setRecovered(undefined);
  };
  return { recovered, discard };
}
