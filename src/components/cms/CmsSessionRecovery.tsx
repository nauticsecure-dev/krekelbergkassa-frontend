'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { loginPath } from '@/lib/auth-routes';

/** Native modal keeps existing editor state (including selected files) intact. */
export function CmsSessionRecovery({ onDiscard }: { onDiscard: () => void }) {
  const { refresh } = useAuth();
  const { locale, t } = useIntl();
  const dialog = React.useRef<HTMLDialogElement>(null);
  const [checking, setChecking] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  React.useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="cms-session-title" aria-describedby="cms-session-description"
    onCancel={(event) => event.preventDefault()}
    onKeyDown={(event) => event.stopPropagation()}
    className="m-auto w-[min(90vw,30rem)] rounded-xl bg-white p-6 text-navy-900 shadow-xl backdrop:bg-black/60">
    <h2 id="cms-session-title" className="text-lg font-semibold">{t('cms.sessionExpired')}</h2>
    <p id="cms-session-description" className="my-4">{t('cms.draftRetained')}</p>
    <a href={loginPath(locale)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{t('cms.signInAgain')}</a>
    <div className="mt-5 flex flex-wrap gap-4">
      <button type="button" disabled={checking} className="rounded-lg bg-navy-900 px-4 py-2 text-white"
        onClick={async () => { setChecking(true); try { await refresh(); setChecked(true); } finally { setChecking(false); } }}>
        {t('cms.resumeEditing')}
      </button>
      <button type="button" onClick={onDiscard}>{t('cms.discardDraft')}</button>
    </div>
    {checked && <p role="status" className="mt-4">{t('cms.sessionNotRestored')}</p>}
  </dialog>;
}
