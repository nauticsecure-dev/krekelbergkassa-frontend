'use client';

import * as React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { usersService } from '@/lib/services';

const IMPERSONATION_KEY = 'krekelberg_impersonation';

export function setImpersonationMeta(name: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(IMPERSONATION_KEY, name);
}

export function clearImpersonationMeta() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(IMPERSONATION_KEY);
}

export function ImpersonationBanner() {
  const { user, signOut } = useAuth();
  const { t } = useIntl();
  const [impersonatingAs, setImpersonatingAs] = React.useState<string | null>(null);
  const [confirmStop, setConfirmStop] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);

  React.useEffect(() => {
    setImpersonatingAs(sessionStorage.getItem(IMPERSONATION_KEY));
  }, [user?.id]);

  if (!impersonatingAs) return null;

  return (
    <>
      <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {t('adminNew.impersonation.banner', { name: impersonatingAs || user?.name || '—' })}
        </span>
        <button
          type="button"
          onClick={() => setConfirmStop(true)}
          className="inline-flex items-center gap-1 rounded-md bg-navy-950/10 px-2 py-0.5 text-xs hover:bg-navy-950/20"
        >
          <X className="h-3 w-3" />
          {t('adminNew.impersonation.stop')}
        </button>
      </div>

      <ConfirmModal
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        onConfirm={async () => {
          setStopping(true);
          try {
            await usersService.stopImpersonation().catch(() => null);
            clearImpersonationMeta();
            await signOut();
            setConfirmStop(false);
          } finally {
            setStopping(false);
          }
        }}
        title={t('adminNew.impersonation.stop')}
        message={t('adminNew.impersonation.confirmStop')}
        confirmLabel={t('adminNew.impersonation.stop')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={AlertTriangle}
        loading={stopping}
      />
    </>
  );
}
