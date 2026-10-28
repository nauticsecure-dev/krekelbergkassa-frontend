'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminFormGrid, AdminSectionCard } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { invoiceLayoutTemplatesService, type InvoiceLayoutBlocks, type InvoiceLayoutTemplate } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const emptyBlocks = (): InvoiceLayoutBlocks => ({
  logo: { enabled: true, align: 'left' },
  header: { title: 'Factuur', show_number: true, show_dates: true },
  lines: { show_description: true, show_quantity: true, show_unit_price: true, show_vat: true },
  totals: { show_subtotal: true, show_vat: true, show_total: true },
  footer: { text: '' },
  terms: { text: '' },
  tags: ['{{invoice_number}}', '{{invoice_date}}', '{{customer_name}}', '{{due_date}}', '{{total}}'],
});

export default function InvoiceLayoutTemplatePage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const templates = useQuery(['invoice-layout-templates'], () => invoiceLayoutTemplatesService.list());
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('Standaard factuur');
  const [footer, setFooter] = React.useState('');
  const [terms, setTerms] = React.useState('');
  const [tags, setTags] = React.useState('{{invoice_number}}, {{customer_name}}, {{due_date}}, {{total}}');
  const [showLogo, setShowLogo] = React.useState(true);
  const [showTotals, setShowTotals] = React.useState(true);
  const [version, setVersion] = React.useState(1);

  const rows = templates.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows.find((row) => row.active) ?? rows[0] ?? null;

  React.useEffect(() => {
    if (!selected) return;
    const blocks = selected.blocks ?? emptyBlocks();
    setName(selected.name);
    setFooter(blocks.footer?.text ?? '');
    setTerms(blocks.terms?.text ?? '');
    setTags((blocks.tags ?? []).join(', '));
    setShowLogo(blocks.logo?.enabled !== false);
    setShowTotals(blocks.totals?.show_total !== false);
    setVersion(selected.version ?? 1);
  }, [selected]);

  const save = useMutation((payload: { id?: string; body: Record<string, unknown> }) =>
    payload.id
      ? invoiceLayoutTemplatesService.update(payload.id, payload.body)
      : invoiceLayoutTemplatesService.create(payload.body)
  );

  const blocksFromForm = (): InvoiceLayoutBlocks => ({
    ...emptyBlocks(),
    ...(selected?.blocks ?? {}),
    logo: { ...selected?.blocks?.logo, enabled: showLogo, align: selected?.blocks?.logo?.align ?? 'left' },
    totals: { show_subtotal: showTotals, show_vat: showTotals, show_total: showTotals },
    footer: { text: footer },
    terms: { text: terms },
    tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
  });

  const uploadLogo = async (file?: File) => {
    if (!selected || !file) return;
    try {
      await invoiceLayoutTemplatesService.uploadLogo(selected.id, file);
      await templates.refetch();
    } catch (error) { push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(error) }); }
  };
  const onSave = async () => {
    if (!name.trim()) {
      push({ tone: 'error', title: t('adminNew.templates.nameRequired') });
      return;
    }
    try {
      const saved = await save.mutate({
        id: selected?.id,
        body: { name: name.trim(), locale: 'nl-NL', active: true, blocks: blocksFromForm() },
      });
      setSelectedId(saved.id);
      push({ tone: 'success', title: t('adminNew.templates.saved') });
      await templates.refetch();
    } catch (error) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(error) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.templates.layoutTitle', { defaultValue: 'Factuuropmaak' })}
        subtitle={t('adminNew.templates.layoutSubtitle', { defaultValue: 'Layout voor gegenereerde factuur-PDF’s: logo, totalen, footer, voorwaarden en tags. Elke opslag bewaart een versie.' })}
        rightSlot={
          <Link href={`/${locale}/admin/facturen/templates`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.templates.extractionBack', { defaultValue: 'Extractiesjablonen' })}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        {templates.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
        {templates.error ? <ErrorState message={templates.error} onRetry={() => void templates.refetch()} /> : null}
        {!templates.loading && !templates.error ? (
          <AdminSectionCard
            title={selected ? `${name} · v${version}` : t('adminNew.templates.layoutTitle', { defaultValue: 'Factuuropmaak' })}
            description={t('adminNew.templates.layoutHint', { defaultValue: 'Dit is geen OCR-sjabloon. Veldzones voor import blijven onder extractiesjablonen.' })}
            icon={FileText}
            action={
              <Button variant="gold" size="sm" disabled={save.loading} onClick={() => void onSave()}>
                {save.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
              </Button>
            }
          >
            {rows.length > 1 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {rows.map((row: InvoiceLayoutTemplate) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${(selected?.id === row.id) ? 'border-marine-500 bg-marine-50 text-marine-800' : 'border-navy-200 bg-white text-navy-700'}`}
                  >
                    {row.name} · v{row.version}
                  </button>
                ))}
              </div>
            ) : null}
            {selected?.warnings?.length ? <p role="alert" className="mb-4 text-sm text-amber-800">{t('adminNew.templates.missingTags', { defaultValue: 'Ontbrekende verplichte tags' })}: {selected.warnings.join(', ')}</p> : null}
            <AdminFormGrid>
              {selected ? <label className="text-sm text-navy-700">{t('adminNew.templates.uploadLogo', { defaultValue: 'Logo uploaden (PNG/JPG, max. 1 MB)' })}<input type="file" accept="image/png,image/jpeg" onChange={(e) => void uploadLogo(e.target.files?.[0])} /></label> : null}
              <Input label={t('adminNew.templates.fieldsMeta.name')} value={name} onChange={(e) => setName(e.target.value)} required />
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
                {t('adminNew.templates.layoutLogo', { defaultValue: 'Logo tonen' })}
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} />
                {t('adminNew.templates.layoutTotals', { defaultValue: 'Totalenblok tonen' })}
              </label>
              <label className="text-sm font-medium text-navy-700 sm:col-span-2">
                {t('adminNew.templates.layoutFooter', { defaultValue: 'Footer' })}
                <textarea className="input-base mt-1 min-h-24 w-full" value={footer} onChange={(e) => setFooter(e.target.value)} />
              </label>
              <label className="text-sm font-medium text-navy-700 sm:col-span-2">
                {t('adminNew.templates.layoutTerms', { defaultValue: 'Voorwaarden' })}
                <textarea className="input-base mt-1 min-h-24 w-full" value={terms} onChange={(e) => setTerms(e.target.value)} />
              </label>
              <label className="text-sm font-medium text-navy-700 sm:col-span-2">
                {t('adminNew.templates.layoutTags', { defaultValue: 'Dynamische tags' })}
                <Input value={tags} onChange={(e) => setTags(e.target.value)} />
              </label>
            </AdminFormGrid>
            {selected?.snapshots?.length ? (
              <p className="mt-4 text-sm text-navy-500">
                {t('adminNew.templates.layoutVersions', { defaultValue: 'Bewaarde versies' })}: {selected.snapshots.map((snapshot) => `v${snapshot.version}`).join(', ')}
              </p>
            ) : null}
          </AdminSectionCard>
        ) : null}
      </AdminContent>
    </>
  );
}
