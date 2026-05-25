'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Smartphone,
  CloudUpload,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminListItem,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
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
  const { t, locale } = useIntl();
  const { push } = useToast();
  const status = useSyncStatus();
  const [items, setItems] = React.useState<PendingChange[]>([]);
  const [syncDevices, setSyncDevices] = React.useState<
    Array<{ device_id?: string; device_name?: string; last_sync_at?: string }>
  >([]);
  const [syncing, setSyncing] = React.useState(false);

  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

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
      await api(item.endpoint, { method: item.method, body: item.payload });
      await removeOfflineChange(item.id);
      push({ tone: 'success', title: t('adminNew.sync.itemSynced') });
      await load();
    } catch (err) {
      await markOfflineFailed(item.id, err instanceof Error ? err.message : 'Unknown sync error');
      push({
        tone: 'error',
        title: t('adminNew.sync.syncFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
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
        eyebrow={t('adminNew.sync.eyebrow')}
        title={t('adminNew.sync.title')}
        subtitle={t('adminNew.sync.subtitle')}
        rightSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void load()}
            >
              {t('adminNew.sync.refresh')}
            </Button>
            <Button variant="gold" size="sm" onClick={() => void syncAll()} disabled={!items.length || syncing}>
              {syncing ? t('adminNew.sync.syncing') : t('adminNew.sync.syncAll')}
            </Button>
          </>
        }
        stats={[
          {
            label: t('adminNew.sync.connection'),
            value: status.online ? t('adminNew.sync.online') : t('adminNew.sync.offline'),
            icon: status.online ? Wifi : WifiOff,
            tone: status.online ? 'success' : 'warning',
          },
          {
            label: t('adminNew.sync.pending'),
            value: status.pending,
            icon: RefreshCw,
            tone: 'marine',
          },
          {
            label: t('adminNew.sync.failed'),
            value: status.failed,
            icon: AlertTriangle,
            tone: status.failed > 0 ? 'danger' : 'success',
          },
          {
            label: t('adminNew.sync.lastSync'),
            value: status.lastSyncAt
              ? new Date(status.lastSyncAt).toLocaleString(dateLocale)
              : '—',
            icon: CheckCircle2,
            tone: 'navy',
          },
        ]}
      />

      <AdminContent className="space-y-5">
        <AdminSectionCard
          title={t('adminNew.sync.pendingChanges')}
          description={t('adminNew.sync.subtitle')}
          icon={CloudUpload}
          action={
            items.length ? (
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
            ) : null
          }
        >
          {items.length ? (
            <div className="space-y-2">
              {items.map((item) => (
                <AdminListItem
                  key={item.id}
                  title={`${item.method} ${item.endpoint}`}
                  subtitle={new Date(item.createdAt).toLocaleString(dateLocale)}
                  error={item.error}
                  actions={
                    <>
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
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-navy-200 bg-sand-50/50 px-6 py-10 text-center text-sm text-navy-500">
              {t('adminNew.sync.noPending')}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.sync.devices')}
          description={t('adminNew.sync.devicesHint')}
          icon={Smartphone}
        >
          {syncDevices.length ? (
            <div className="space-y-2">
              {syncDevices.map((device, idx) => (
                <AdminListItem
                  key={device.device_id ?? idx}
                  title={device.device_name ?? device.device_id ?? `Device ${idx + 1}`}
                  subtitle={`ID: ${device.device_id ?? '—'}`}
                  meta={
                    <>
                      {t('adminNew.sync.lastSync')}:{' '}
                      {device.last_sync_at
                        ? new Date(device.last_sync_at).toLocaleString(dateLocale)
                        : '—'}
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-navy-200 bg-sand-50/50 px-6 py-10 text-center text-sm text-navy-500">
              {t('adminNew.sync.noDevices')}
            </div>
          )}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
