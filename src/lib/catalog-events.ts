'use client';
import * as React from 'react';
import { api } from '@/lib/api';

export function publishCatalogChange() {
  window.dispatchEvent(new Event('catalog-published'));
  window.localStorage.setItem('catalog-published', String(Date.now()));
}

export function useCatalogUpdates() {
  const [changed, setChanged] = React.useState(false);
  React.useEffect(() => {
    const mark = () => setChanged(true);
    const storage = (event: StorageEvent) => { if (event.key === 'catalog-published') mark(); };
    window.addEventListener('catalog-published', mark);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('catalog-published', mark); window.removeEventListener('storage', storage); };
  }, []);
  React.useEffect(() => {
    let version: string | undefined;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const result = await api<{ version: string }>('/v1/service-catalog/version', { auth: false });
        if (stopped) return;
        if (version && version !== result.version) publishCatalogChange();
        version = result.version;
      } catch { /* Existing query errors remain visible; focus retries refresh. */ }
    };
    void check();
    const timer = window.setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', check); };
  }, []);
  return { changed, acknowledge: () => setChanged(false) };
}
