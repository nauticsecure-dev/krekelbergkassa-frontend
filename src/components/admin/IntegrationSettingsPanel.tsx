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
  const [form, setForm] = React.useState<IntegrationSettings['configuration']>({
    inbound_address: '',
    ocr_model: '',
    whatsapp_enabled: true,
  });
  const [transaction, setTransaction] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    if (query.data) setForm(query.data.configuration);
  }, [query.data]);

  const act = async (name: string, operation: () => Promise<unknown>) => {
    setBusy(name);
    setError('');
    try {
      await operation();
      await query.refetch();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (query.loading) return <p>{t('adminNew.settings.loading')}</p>;

  const health = query.data?.health ?? {};

  return (
    <div className="space-y-4">
      {query.error || error ? (
        <p role="alert" className="text-red-700">
          {error || query.error}
        </p>
      ) : null}

      <fieldset
        disabled={!can('settings.update') || busy !== null}
        className="grid gap-3 rounded-xl border border-navy-100 bg-white p-5 sm:grid-cols-2"
      >
        <Input
          label={t('settingsHub.mailbox')}
          value={form.inbound_address ?? ''}
          onChange={(e) => setForm({ ...form, inbound_address: e.target.value || null })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.whatsapp_enabled}
            onChange={(e) => setForm({ ...form, whatsapp_enabled: e.target.checked })}
          />
          {t('settingsHub.whatsappEnabled')}
        </label>
        <div className="sm:col-span-2">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Geavanceerd verbergen' : 'Geavanceerd (OCR-model)'}
          </button>
          {showAdvanced ? (
            <div className="mt-2">
              <Input
                label={t('settingsHub.ocrModel')}
                value={form.ocr_model}
                onChange={(e) => setForm({ ...form, ocr_model: e.target.value })}
              />
              <p className="mt-1 text-xs text-navy-500">
                Normale beheerders hoeven het model niet te wijzigen. Gebruik Upload/test in OCR-review.
              </p>
            </div>
          ) : null}
        </div>
        <Button onClick={() => void act('save', () => settingsService.updateIntegrations(form))}>
          {t('adminNew.common.save')}
        </Button>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(health).map(([name, item]) => (
          <article key={name} className="space-y-3 rounded-xl border bg-white p-5">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{tEnum(t, 'settingsHub.integrations', name)}</h3>
              <Badge tone={item.last_test?.ok ? 'success' : item.configured ? 'warning' : 'danger'}>
                {item.last_test?.status ??
                  (item.configured ? t('settingsHub.untested') : t('settingsHub.setupRequired'))}
              </Badge>
            </div>
            <p className="text-sm">{item.description}</p>
            <p className="text-sm text-navy-500">{item.setup}</p>
            {item.last_test ? (
              <p role="status" className="text-sm">
                {item.last_test.message} <time>{item.last_test.checked_at}</time>
              </p>
            ) : null}
            {name === 'signhost' ? (
              <Input
                label={t('settingsHub.transactionId')}
                value={transaction}
                onChange={(e) => setTransaction(e.target.value)}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {name === 'mollie' ? (
                <Button
                  disabled={!can('settings.update') || busy !== null}
                  onClick={() =>
                    void act(name, async () => {
                      await settingsService.testMollie();
                    })
                  }
                >
                  {t('settingsHub.runDiagnostic')}
                </Button>
              ) : name !== 'google_places' ? (
                <Button
                  disabled={
                    !can('settings.update') ||
                    busy !== null ||
                    (name === 'signhost' && !transaction)
                  }
                  onClick={() =>
                    void act(name, () =>
                      settingsService.testIntegration(
                        name,
                        name === 'signhost' ? transaction : undefined,
                      ),
                    )
                  }
                >
                  {t('settingsHub.runDiagnostic')}
                </Button>
              ) : null}
              <Link
                className="text-sm underline"
                href={
                  item.path.includes('#')
                    ? `/${locale}/admin/${item.path}`
                    : `/${locale}/admin/${item.path}`
                }
              >
                {t('settingsHub.openWorkflow')}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
