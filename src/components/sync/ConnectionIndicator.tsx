'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Badge } from '@/components/ui/Badge';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';

export function ConnectionIndicator() {
  const { locale, t } = useIntl();
  const { online, pending, failed, loading, stateLabel } = useSyncStatus();

  if (loading) {
    return (
      <Badge tone="navy" className="hidden sm:inline-flex" dot>
        <RefreshCw className="h-3 w-3 animate-spin" /> {t('adminNew.sync.syncing')}
      </Badge>
    );
  }

  const tone = !online ? 'warning' : failed > 0 ? 'danger' : pending > 0 ? 'marine' : 'success';

  return (
    <Link href={`/${locale}/admin/sync`} className="hidden sm:inline-flex">
      <Badge tone={tone} className="cursor-pointer" dot>
        {!online ? <WifiOff className="h-3 w-3" /> : failed > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        {stateLabel === 'Offline'
          ? t('adminNew.sync.offline')
          : stateLabel === 'Sync wachtend'
            ? t('adminNew.sync.pending')
            : stateLabel === 'Sync fout'
              ? t('adminNew.sync.error')
              : t('adminNew.sync.online')}
        {pending > 0 ? ` · ${pending}` : ''}
      </Badge>
    </Link>
  );
}
