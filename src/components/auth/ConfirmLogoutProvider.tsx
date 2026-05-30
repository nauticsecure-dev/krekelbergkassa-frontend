'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';

const ConfirmLogoutCtx = React.createContext<{ requestLogout: () => void } | null>(null);

export function ConfirmLogoutProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { signOut } = useAuth();
  const { t } = useIntl();

  const requestLogout = React.useCallback(() => setOpen(true), []);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await signOut();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmLogoutCtx.Provider value={{ requestLogout }}>
      {children}
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={t('adminNew.common.logout')}
        message={t('adminNew.common.confirmLogout')}
        confirmLabel={t('adminNew.common.logout')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={LogOut}
        loading={loading}
      />
    </ConfirmLogoutCtx.Provider>
  );
}

export function useConfirmLogout() {
  const ctx = React.useContext(ConfirmLogoutCtx);
  if (!ctx) {
    throw new Error('useConfirmLogout must be used within ConfirmLogoutProvider');
  }
  return ctx;
}
