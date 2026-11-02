'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Badge } from '@/components/ui/Badge';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';

export function ConnectionIndicator() {
  const { locale, t } = useIntl();
  const { online, pending, failed, loading, error, stateLabel } = useSyncStatus();

  if (loading) {
    return (
      <Badge tone="navy" className="hidden sm:inline-flex" dot>
        <RefreshCw className="h-3 w-3 animate-spin" /> {<TranslatedText textKey={'adminNew.sync.syncing'} />}
      </Badge>
    );
  }

  const hasSyncError = error || failed > 0;
  const tone = !online ? 'warning' : hasSyncError ? 'danger' : pending > 0 ? 'marine' : 'success';

  return (
    <Link href={`/${locale}/admin/sync`} className="hidden sm:inline-flex">
      <Badge tone={tone} className="cursor-pointer" dot>
        {!online ? <WifiOff className="h-3 w-3" /> : hasSyncError ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        {stateLabel === 'Offline'
          ? <TranslatedText textKey={'adminNew.sync.offline'} />
          : stateLabel === 'Sync wachtend'
            ? <TranslatedText textKey={'adminNew.sync.pending'} />
            : stateLabel === 'Sync fout'
              ? <TranslatedText textKey={'adminNew.sync.error'} />
              : <TranslatedText textKey={'adminNew.sync.online'} />}
        {pending > 0 ? ` · ${pending}` : ''}
      </Badge>
    </Link>
  );
}
