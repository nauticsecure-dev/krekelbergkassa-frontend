'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import * as React from 'react';
import Link from 'next/link';
import { useIntl } from '@/i18n/IntlProvider';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { serviceCatalogService } from '@/lib/services';
import { formatCurrency, intlLocale } from '@/lib/format';

export default function ServiceRequestPage() {
  const { t, locale } = useIntl();
  const [selection, setSelection] = React.useState<Awaited<ReturnType<typeof serviceCatalogService.bookingSelection>>>();
  const [token, setToken] = React.useState('');
  const [error, setError] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    const value = new URLSearchParams(window.location.search).get('selection') ?? '';
    setToken(value);
    void serviceCatalogService.bookingSelection(value).then((data) => {
      if (cancelled) return;
      if (data.journey !== 'storage-request') { setError(t('smartServices.invalidSelection')); return; }
      setSelection(data);
    }).catch(() => { if (!cancelled) setError(t('smartServices.invalidSelection')); });
    return () => { cancelled = true; };
  }, [t]);
  return <main className="container-wide max-w-3xl py-16">
    <h1 className="heading-display text-4xl"><TranslatedText textKey="smartServices.requestTitle" /></h1>
    {reference ? <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-5"><TranslatedText textKey="smartServices.requestReceived" /><span className="block">{reference}</span></p> : <>
      {selection && <div className="my-6 rounded-xl border bg-sand-50 p-5">
        <p>{selection.service_codes.join(' + ')} · {selection.length_cm} <TranslatedText textKey="siteCopy.a8b4674a927ba5c7" fallbackText={" cm"} /></p>
        <p>{selection.options?.period_from} — {selection.options?.period_to}</p>
        <strong>{formatCurrency(selection.total_incl_vat / 100, intlLocale(locale))}</strong>
      </div>}
      {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
      {selection && <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget);
        try {
          const result = await api<{ reference: string }>('/v1/service-catalog/requests', { auth: false, portalAuth: true, method: 'POST', body: {
            token, name: data.get('name'), email: data.get('email'), boat_name: data.get('boat_name'), expected_total_cents: selection.total_incl_vat,
          } }); setReference(result.reference);
        } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); }
      }}>
        <label className="block"><TranslatedText textKey="smartServices.name" /><input name="name" autoComplete="name" required maxLength={120} className="input-base mt-1 w-full" /></label>
        <label className="block"><TranslatedText textKey="smartServices.email" /><input name="email" type="email" autoComplete="email" required className="input-base mt-1 w-full" /></label>
        <label className="block"><TranslatedText textKey="smartServices.boatName" /><input name="boat_name" required maxLength={120} className="input-base mt-1 w-full" /></label>
        <button disabled={busy} className="rounded-lg bg-navy-900 px-5 py-3 text-white disabled:opacity-50"><TranslatedText textKey="smartServices.sendRequest" /></button>
      </form>}
    </>}
    <Link className="mt-6 inline-block underline" href={'/' + locale + '/diensten'}><TranslatedText textKey="adminNew.common.back" /></Link>
  </main>;
}
