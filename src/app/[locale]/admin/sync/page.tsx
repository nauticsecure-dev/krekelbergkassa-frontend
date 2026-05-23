'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
import {
  clearOfflineChanges,
  listOfflineChanges,
  markOfflineFailed,
  removeOfflineChange,
  type PendingChange,
} from '@/lib/offline-sync';
import { api } from '@/lib/api';
import { syncService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';

export default function SyncStatusPage() {
  const { t } = useIntl();
  const { push } = useToast();
  const status = useSyncStatus();
  const [items, setItems] = React.useState<PendingChange[]>([]);
  const [syncDevices, setSyncDevices] = React.useState<Array<{ device_id?: string; device_name?: string; last_sync_at?: string }>>([]);
  const [syncing, setSyncing] = React.useState(false);

  const load = React.useCallback(async () => {
    const [queued, devices] = await Promise.all([
      listOfflineChanges().catch(() => []),
      syncService.devices().catch(() => []),
    ]);
    setItems(queued);
    setSyncDevices(devices as Array<{ device_id?: string; device_name?: string; last_sync_at?: string }>);
    await status.refresh();
  }, [status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const retryItem = async (item: PendingChange) => {
    try {
      await api(item.endpoint, {
        method: item.method,
        body: item.payload,
      });
      await removeOfflineChange(item.id);
      push({ tone: 'success', title: t('adminNew.sync.itemSynced') });
      await load();
    } catch (err) {
      await markOfflineFailed(item.id, err instanceof Error ? err.message : 'Unknown sync error');
      push({ tone: 'error', title: t('adminNew.sync.syncFailed'), message: err instanceof Error ? err.message : undefined });
      await load();
    }
  };

  const syncAll = async () => {
    if (!items.length) return;
    setSyncing(true);
    for (const item of items) {
      await retryItem(item);
    }
    setSyncing(false);
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.sync.title')}
        subtitle={t('adminNew.sync.subtitle')}
        rightSlot={
          <>
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
              {t('adminNew.sync.refresh')}
            </Button>
            <Button variant="gold" size="sm" onClick={() => void syncAll()} disabled={!items.length || syncing}>
              {syncing ? t('adminNew.sync.syncing') : t('adminNew.sync.syncAll')}
            </Button>
          </>
        }
      />

      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat title={t('adminNew.sync.connection')} value={status.online ? t('adminNew.sync.online') : t('adminNew.sync.offline')} icon={status.online ? Wifi : WifiOff} tone={status.online ? 'success' : 'warning'} />
          <Stat title={t('adminNew.sync.pending')} value={String(status.pending)} icon={RefreshCw} tone="marine" />
          <Stat title={t('adminNew.sync.failed')} value={String(status.failed)} icon={AlertTriangle} tone={status.failed > 0 ? 'danger' : 'success'} />
          <Stat title={t('adminNew.sync.lastSync')} value={status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : '-'} icon={CheckCircle2} tone="navy" />
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
            <div className="text-sm font-semibold text-navy-900">{t('adminNew.sync.pendingChanges')}</div>
            {items.length ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() =>
                  void (async () => {
                    await clearOfflineChanges();
                    await load();
                  })()
                }
              >
                {t('adminNew.sync.clear')}
              </Button>
            ) : null}
          </div>
          <div className="divide-y divide-navy-100">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-navy-900">{item.method} {item.endpoint}</div>
                    <div className="text-xs text-navy-500">{new Date(item.createdAt).toLocaleString()}</div>
                    {item.error ? <div className="text-xs text-rose-600">{item.error}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={item.status === 'failed' ? 'danger' : 'warning'}>{item.status}</Badge>
                    <Button variant="outline" size="sm" onClick={() => void retryItem(item)}>
                      {t('adminNew.sync.retry')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void (async () => {
                          await removeOfflineChange(item.id);
                          await load();
                        })()
                      }
                    >
                      {t('adminNew.common.delete')}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-navy-500">{t('adminNew.sync.noPending')}</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">{t('adminNew.sync.devices')}</div>
          <div className="divide-y divide-navy-100">
            {syncDevices.length ? (
              syncDevices.map((device, idx) => (
                <div key={device.device_id ?? idx} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-navy-900">{device.device_name ?? device.device_id ?? `Device ${idx + 1}`}</div>
                    <div className="text-xs text-navy-500">ID: {device.device_id ?? '-'}</div>
                  </div>
                  <div className="text-xs text-navy-500">{t('adminNew.sync.lastSync')}: {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString() : '-'}</div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-navy-500">{t('adminNew.sync.noDevices')}</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'success' | 'warning' | 'danger' | 'marine' | 'navy';
}) {
  const toneClass: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    marine: 'bg-marine-50 text-marine-700',
    navy: 'bg-navy-50 text-navy-700',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-navy-500">{title}</div>
          <div className="mt-1 text-sm font-semibold text-navy-900">{value}</div>
        </div>
        <span className={`rounded-lg p-2 ${toneClass[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
