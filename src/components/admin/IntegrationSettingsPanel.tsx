'use client';
import { tEnum } from '@/i18n/admin-enums';
import * as React from 'react';
import Link from 'next/link';
import { settingsService, type IntegrationSettings } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { usePermission } from '@/lib/permissions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/api-error';
export function IntegrationSettingsPanel() {
  const { t, locale } = useIntl();
  const { can } = usePermission();
  const query = useQuery(['settings-integrations'], settingsService.integrations);
  const [form, setForm] = React.useState<IntegrationSettings['configuration']>({inbound_address: '', ocr_model: '', whatsapp_enabled: true});
  const [transaction, setTransaction] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => { if(query.data) setForm(query.data.configuration); }, [query.data]);
  const act = async (name: string, operation: () => Promise<unknown>) => {
    setBusy(name); setError('');
    try { await operation(); await query.refetch(); } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(null); }
  };
  if (query.loading) return <p>{t('adminNew.settings.loading')}</p>;
  return <div className="space-y-4">
    {query.error || error ? <p role="alert" className="text-red-700">{error || query.error}</p> : null}
    <fieldset disabled={!can('settings.update') || busy !== null} className="grid gap-3 rounded-xl bg-white p-5 sm:grid-cols-2">
      <Input label={t('settingsHub.mailbox')} value={form.inbound_address ?? ''} onChange={e => setForm({...form, inbound_address:e.target.value || null})} />
      <Input label={t('settingsHub.ocrModel')} value={form.ocr_model} onChange={e => setForm({...form, ocr_model:e.target.value})} />
      <label><input type="checkbox" checked={form.whatsapp_enabled} onChange={e => setForm({...form, whatsapp_enabled:e.target.checked})} /> {t('settingsHub.whatsappEnabled')}</label>
      <Button onClick={() => void act('save', () => settingsService.updateIntegrations(form))}>{t('adminNew.common.save')}</Button>
    </fieldset>
    <div className="grid gap-4 md:grid-cols-2">
    {Object.entries(query.data?.health ?? {}).map(([name, health]) => <article key={name} className="space-y-3 rounded-xl border bg-white p-5">
      <div className="flex justify-between"><h3 className="font-semibold">{tEnum(t, 'settingsHub.integrations', name)}</h3><Badge tone={health.last_test?.ok ? 'success' : 'warning'}>{health.last_test?.status ?? (health.configured ? t('settingsHub.untested') : t('settingsHub.setupRequired'))}</Badge></div>
      <p className="text-sm">{health.description}</p><p className="text-sm text-navy-500">{health.setup}</p>
      {health.last_test ? <p role="status" className="text-sm">{health.last_test.message} <time>{health.last_test.checked_at}</time></p> : null}
      {name === 'signhost' ? <Input label={t('settingsHub.transactionId')} value={transaction} onChange={e => setTransaction(e.target.value)} /> : null}
      <div className="flex items-center gap-3"><Button disabled={!can('settings.update') || busy !== null || (name === 'signhost' && !transaction)} onClick={() => void act(name, () => settingsService.testIntegration(name, name === 'signhost' ? transaction : undefined))}>{t('settingsHub.runDiagnostic')}</Button><Link className="text-sm underline" href={`/${locale}/admin/${health.path}`}>{t('settingsHub.openWorkflow')}</Link></div>
    </article>)}
    </div>
  </div>;
}
