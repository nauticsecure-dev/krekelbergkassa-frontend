'use client';

import * as React from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { portalService } from '@/lib/services';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';

const copy = {
  nl: ['Huidig wachtwoord', 'Nieuw wachtwoord (12–72 tekens)', 'Bevestig nieuw wachtwoord', 'Wachtwoord opslaan', 'Wachtwoord opgeslagen.', 'De wachtwoorden komen niet overeen.'],
  en: ['Current password', 'New password (12–72 characters)', 'Confirm new password', 'Save password', 'Password saved.', 'Passwords do not match.'],
  de: ['Aktuelles Passwort', 'Neues Passwort (12–72 Zeichen)', 'Neues Passwort bestätigen', 'Passwort speichern', 'Passwort gespeichert.', 'Die Passwörter stimmen nicht überein.'],
  fr: ['Mot de passe actuel', 'Nouveau mot de passe (12–72 caractères)', 'Confirmer le nouveau mot de passe', 'Enregistrer le mot de passe', 'Mot de passe enregistré.', 'Les mots de passe ne correspondent pas.'],
};

export function PasswordForm({ hasPassword, onSaved }: { hasPassword: boolean; onSaved: () => Promise<unknown> }) {
  const { locale } = useIntl();
  const labels = copy[locale as keyof typeof copy] ?? copy.nl;
  const [current, setCurrent] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [configured, setConfigured] = React.useState(false);
  const requiresCurrent = hasPassword || configured;

  return <form className="mt-5 space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (password !== confirmation) { setError(labels[5]); return; }
    setBusy(true);
    try {
      await portalService.changePassword(password, confirmation, requiresCurrent ? current : undefined);
      setCurrent(''); setPassword(''); setConfirmation(''); setSaved(true); setConfigured(true);
      // Profile refresh is secondary: a failed read must not obscure a saved password.
      await onSaved().catch(() => undefined);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }}>
    {requiresCurrent && <label className="block text-sm">{labels[0]}
      <input className="input-base mt-1 w-full" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} disabled={busy} />
    </label>}
    <label className="block text-sm">{labels[1]}
      <input className="input-base mt-1 w-full" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
    </label>
    <label className="block text-sm">{labels[2]}
      <input className="input-base mt-1 w-full" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
    </label>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-700">{labels[4]}</p>}
    <Button type="submit" disabled={busy}>{labels[3]}</Button>
  </form>;
}
