'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useCms } from '@/components/cms/CmsProvider';
import { usePermission } from '@/lib/permissions';
import { useIntl } from '@/i18n/IntlProvider';
import { publishCatalogChange } from '@/lib/catalog-events';
import { pricingService, type ServiceCatalogService, type ServiceCatalogTariff } from '@/lib/services';

export interface PricingDraftPreview {
  draft: { id: string; change_reason: string };
  current: { price_incl_vat: number };
  proposed: { price_incl_vat: number };
  stale: boolean;
  impact: { direct_displays: string[]; derived_calculations: string[]; package_consumers: { name: string }[]; historical_snapshots_change: boolean };
}

export function DraftReview({ draftId, onPublished }: { draftId: string; onPublished: () => void }) {
  const [preview, setPreview] = React.useState<PricingDraftPreview>();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { void api<PricingDraftPreview>('/v1/pricing/drafts/' + draftId).then(setPreview).catch((e) => setError(getApiErrorMessage(e))); }, [draftId]);
  return <div className="my-3 rounded-lg border border-gold-500 bg-white p-3 text-left text-sm text-navy-950">
    <strong><TranslatedText textKey="smartServices.draft" inline={false} /></strong>
    {error && <p role="alert">{error}</p>}
    {preview && <>
      <p>{preview.draft.change_reason}</p>
      <p>€ {(preview.current.price_incl_vat / 100).toFixed(2)} → € {(preview.proposed.price_incl_vat / 100).toFixed(2)}</p>
      <p><TranslatedText textKey="smartServices.impact" inline={false} />: {[...preview.impact.direct_displays, ...preview.impact.derived_calculations, ...preview.impact.package_consumers.map((p) => p.name)].join(', ')}</p>
      <p><TranslatedText textKey="smartServices.historyPreserved" inline={false} /></p>
      {preview.stale && <p role="alert"><TranslatedText textKey="smartServices.stale" inline={false} /></p>}
      <button type="button" className="mt-2 rounded bg-navy-900 px-3 py-2 text-white disabled:opacity-50" disabled={busy || preview.stale} onClick={async () => {
        setBusy(true); setError('');
        try { await api('/v1/pricing/drafts/' + draftId + '/publish', { method: 'POST' }); publishCatalogChange(); onPublished(); }
        catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); }
      }}><TranslatedText textKey="smartServices.publish" inline={false} /></button>
    </>}
  </div>;
}

export function CanonicalServiceEditor({ service }: { service: ServiceCatalogService }) {
  const { isCmsEditing } = useCms();
  const { can } = usePermission();
  const { locale } = useIntl();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  if (!isCmsEditing || !can('products.write') || !service.id) return null;
  return <div className="mt-2 text-left text-sm text-navy-900">
    <button type="button" className="underline" onClick={() => setOpen(!open)}><TranslatedText textKey="smartServices.editService" inline={false} /></button>
    {open && <form className="mt-2 space-y-2 rounded-lg border bg-white p-3" onSubmit={async (event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
      try {
        const options = JSON.parse(String(data.get('options')));
        await api('/v1/products/' + service.id + '/business', { method: 'PATCH', body: {
          expected_revision: service.business_revision, locale: { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[locale] ?? 'nl-NL',
          name: data.get('name'), description: data.get('description'), options, change_reason: data.get('reason'),
        } });
        publishCatalogChange(); setOpen(false);
      } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); }
    }}>
      <label className="block"><TranslatedText textKey="smartServices.name" inline={false} /><input name="name" required maxLength={120} defaultValue={service.name} className="input-base w-full" /></label>
      <label className="block"><TranslatedText textKey="smartServices.description" inline={false} /><textarea name="description" maxLength={500} defaultValue={service.description} className="input-base w-full" /></label>
      <label className="block"><TranslatedText textKey="smartServices.options" inline={false} /><textarea name="options" required defaultValue={JSON.stringify(service.options ?? {}, null, 2)} className="input-base w-full font-mono" rows={5} /></label>
      <label className="block"><TranslatedText textKey="smartServices.reason" inline={false} /><input name="reason" required minLength={3} className="input-base w-full" /></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} className="rounded bg-navy-900 px-3 py-2 text-white"><TranslatedText textKey="adminNew.common.save" inline={false} /></button>
    </form>}
  </div>;
}

export function InlineTariffEditor({ rule }: { rule: ServiceCatalogTariff }) {
  const { isCmsEditing } = useCms(); const { can } = usePermission();
  const [open, setOpen] = React.useState(false); const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState(''); const [busy, setBusy] = React.useState(false);
  if (!isCmsEditing || !can('pricing.update') || !rule.id) return null;
  return <div>
    <button type="button" className="underline" onClick={() => setOpen(!open)}><TranslatedText textKey="smartServices.editTariff" inline={false} /></button>
    {open && !draft && <form className="space-y-2 rounded border bg-white p-2 text-left" onSubmit={async (event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
      try {
        const price = Math.round(Number(data.get('price')) * 100); const rate = Number(rule.vat_rate ?? 21);
        const result = await pricingService.updateRule(rule.id!, { expected_revision: rule.revision, change_reason: data.get('reason'), price_incl_vat: price, price_excl_vat: Math.round(price / (1 + rate / 100)) });
        setDraft(result.draft_id ?? '');
      } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); }
    }}>
      <label className="block"><TranslatedText textKey="globalUx.pricing.priceEuro" inline={false} /><input className="input-base w-full" name="price" type="number" min="0" step="0.01" required defaultValue={(Number(rule.price_incl_vat) / 100).toFixed(2)} /></label>
      <label className="block"><TranslatedText textKey="smartServices.reason" inline={false} /><input className="input-base w-full" name="reason" required minLength={3} /></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} className="rounded bg-navy-900 px-3 py-2 text-white"><TranslatedText textKey="smartServices.saveDraft" inline={false} /></button>
    </form>}
    {open && draft && <DraftReview draftId={draft} onPublished={() => { setDraft(''); setOpen(false); }} />}
  </div>;
}
