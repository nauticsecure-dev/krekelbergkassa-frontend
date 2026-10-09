'use client';

import * as React from 'react';
import { listOfflineChanges } from '@/lib/offline-sync';
import { syncService } from '@/lib/services';
import { useOnlineStatus } from './useOnlineStatus';

export function useSyncStatus() {
  const online = useOnlineStatus();
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(0);
  const [failed, setFailed] = React.useState(0);
  const [lastSyncAt, setLastSyncAt] = React.useState<string | null>(null);
  const [deviceName, setDeviceName] = React.useState<string | undefined>(undefined);
  const [error, setError] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [queued, status] = await Promise.all([
        listOfflineChanges(),
        syncService.status(),
      ]);
      setPending(queued.filter((x) => x.status === 'pending').length);
      setFailed(queued.filter((x) => x.status === 'failed').length);
      setLastSyncAt(status.last_sync_at ?? null);
      setDeviceName(status?.device_name);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh, online]);

  return {
    online,
    loading,
    pending,
    failed,
    lastSyncAt,
    error,
    deviceName,
    refresh,
    stateLabel: !online
      ? 'Offline'
      : pending > 0
        ? 'Sync wachtend'
        : error || failed > 0
          ? 'Sync fout'
          : 'Online',
  };
}
