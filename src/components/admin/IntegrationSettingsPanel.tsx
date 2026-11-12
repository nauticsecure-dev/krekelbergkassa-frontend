'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
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
  const [verificationInput, setVerificationInput] = React.useState<Record<string, string>>({});
  const [transaction, setTransaction] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const dirty = query.data !== null && query.data !== undefined &&
    JSON.stringify(form) !== JSON.stringify(query.data.configuration);

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

  if (query.loading) return <p>{<TranslatedText textKey={'adminNew.settings.loading'} />}</p>;

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
          {<TranslatedText textKey={'settingsHub.whatsappEnabled'} />}
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
                <TranslatedText textKey="siteCopy.0a06ab548396f15e" fallbackText={"Normale beheerders hoeven het model niet te wijzigen. Gebruik Upload/test in OCR-review."} /></p>
            </div>
          ) : null}
        </div>
        {dirty ? <p role="status" className="text-sm text-amber-800 sm:col-span-2"><TranslatedText textKey={'settingsHub.saveBeforeDiagnostic'} /></p> : null}
        <Button disabled={!query.data || !dirty} onClick={() => void act('save', () => settingsService.updateIntegrations(form))}>
          {<TranslatedText textKey={'adminNew.common.save'} />}
        </Button>
      </fieldset>

      <Button disabled={busy !== null} onClick={() => void act('refresh', () => query.refetch())}><TranslatedText textKey="settingsHub.operational.refresh" /></Button>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(health).map(([name, item]) => (
          <article key={name} className="space-y-3 rounded-xl border bg-white p-5">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{tEnum(t, 'settingsHub.integrations', name)}</h3>
              <Badge tone={item.configured ? 'navy' : 'danger'}>
                {item.configured ? t('settingsHub.configurationPresent') : t('settingsHub.setupRequired')}
              </Badge>
            </div>
            <p className="text-sm">{item.description}</p>
            <p className="text-sm text-navy-500">{item.setup}</p>
            {item.runtime_configured != null ? (
              <p className="text-sm"><TranslatedText textKey={'settingsHub.signingConfiguration'} />: {item.runtime_configured ? t('settingsHub.configurationPresent') : t('settingsHub.setupRequired')}</p>
            ) : null}
            <div className="flex items-center gap-2 text-sm">
              <span><TranslatedText textKey={'settingsHub.diagnosticResult'} /></span>
              <Badge tone={item.last_test ? (item.last_test.ok ? 'success' : 'danger') : 'warning'}>
                {item.last_test?.status ?? t('settingsHub.untested')}
              </Badge>
            </div>
            {item.last_test ? (
              <p role="status" className="text-sm">
                {item.last_test.message} <time dateTime={item.last_test.checked_at}>{new Date(item.last_test.checked_at).toLocaleString(locale)}</time>
              </p>
            ) : null}
            {item.verification ? (
              <div className="rounded-lg bg-navy-50 p-3 text-sm">
                <p className="font-medium"><TranslatedText textKey={'settingsHub.workflowVerification'} /></p>
                <p>{item.verification}</p>
              </div>
            ) : null}
            {['email', 'whatsapp', 'mailbox', 'ocr', 'signhost'].includes(name) ? (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium"><TranslatedText textKey="settingsHub.operational.title" /></p>
                <p><TranslatedText textKey="settingsHub.operational.warning" /></p>
                <label className="block">
                  {name === 'email' || name === 'whatsapp' ? t('settingsHub.operational.recipient') : t('settingsHub.operational.references')}
                  <textarea className="mt-1 block w-full rounded border p-2" rows={3}
                    aria-label={`${t('settingsHub.operational.title')} ${name}`}
                    value={verificationInput[name] ?? ''}
                    placeholder={name === 'email' ? 'naam@example.nl' : name === 'whatsapp' ? '+31612345678' : name === 'mailbox' ? '{"file_id":"…"}' : name === 'ocr' ? '{"import_id":"…","expected":{"supplier_name":"…"}}' : '{"contract_id":"…","file_id":"…"}'}
                    onChange={(event) => setVerificationInput({ ...verificationInput, [name]: event.target.value })} />
                </label>
                {name === 'mailbox' ? <p><TranslatedText textKey="settingsHub.operational.relay" /></p> : null}
                <Button disabled={!can('settings.update') || busy !== null || dirty || !verificationInput[name]?.trim() || (name === 'signhost' && !can('stalling.write')) || (['mailbox', 'ocr'].includes(name) && !can('invoice.create'))}
                  onClick={() => void act(`verify-${name}`, () => {
                    const raw = verificationInput[name].trim();
                    const input = name === 'email' || name === 'whatsapp' ? { recipient: raw } : JSON.parse(raw) as Record<string, unknown>;
                    return settingsService.verifyIntegration(name, input);
                  })}><TranslatedText textKey="settingsHub.operational.start" /></Button>
                {item.last_verification ? (
                  <div role="status" className="space-y-1">
                    <p><TranslatedText textKey="settingsHub.operational.result" />: <strong>{item.last_verification.status}</strong></p>
                    <p className="break-all"><TranslatedText textKey="settingsHub.operational.id" />: {item.last_verification.id}</p>
                    <time dateTime={item.last_verification.created_at}>{new Date(item.last_verification.created_at).toLocaleString(locale)}</time>
                    {item.last_verification.current_configuration === false ? <p className="text-amber-800"><TranslatedText textKey="settingsHub.operational.changed" /></p> : null}
                    <details><summary><TranslatedText textKey="settingsHub.operational.evidence" /></summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ references: item.last_verification.references, evidence: item.last_verification.evidence }, null, 2)}</pre></details>
                  </div>
                ) : <p><TranslatedText textKey="settingsHub.operational.empty" /></p>}
              </div>
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
                  disabled={!can('settings.update') || busy !== null || dirty}
                  onClick={() =>
                    void act(name, async () => {
                      await settingsService.testMollie();
                    })
                  }
                >
                  {<TranslatedText textKey={'settingsHub.runDiagnostic'} />}
                </Button>
              ) : name !== 'google_places' ? (
                <Button
                  disabled={
                    !can('settings.update') ||
                    busy !== null ||
                    dirty ||
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
                  {<TranslatedText textKey={'settingsHub.runDiagnostic'} />}
                </Button>
              ) : null}
              <Link
                className="text-sm underline"
                href={`/${locale}/admin/${item.path}`}
              >
                {<TranslatedText textKey={'settingsHub.openWorkflow'} />}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
