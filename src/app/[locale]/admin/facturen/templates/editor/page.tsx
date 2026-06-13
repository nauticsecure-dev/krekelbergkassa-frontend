'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ScanText } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/admin/DataState';
import { DocumentZoneEditor } from '@/components/admin/DocumentZoneEditor';
import { extractionTemplatesService, invoiceImportsService, type ExtractionZone } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

function EditorInner() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const importId = params.get('importId');

  const [name, setName] = React.useState('');
  const [documentType, setDocumentType] = React.useState('purchase_invoice');
  const [supplierEmail, setSupplierEmail] = React.useState('');
  const [keywords, setKeywords] = React.useState('');
  const [zones, setZones] = React.useState<ExtractionZone[]>([]);

  const existing = useQuery([id ?? 'new'], () =>
    id ? extractionTemplatesService.get(id) : Promise.resolve(null)
  );

  // Trello #70/#81: when arriving from a saved import, load its source PDF
  // into the zone editor so staff can tag fields against the real document.
  const sourcePdf = useQuery([importId ?? 'no-import'], () =>
    importId ? invoiceImportsService.sourcePdf(importId).catch(() => null) : Promise.resolve(null)
  );
  const sourceUrl = sourcePdf.data?.signed_url ?? null;

  React.useEffect(() => {
    const tpl = existing.data;
    if (!tpl) return;
    setName(tpl.name ?? '');
    setDocumentType(tpl.document_type ?? 'purchase_invoice');
    setSupplierEmail(tpl.supplier_email ?? '');
    setKeywords((tpl.match_keywords ?? []).join(', '));
    setZones(tpl.field_zones ?? []);
  }, [existing.data]);

  const save = useMutation((payload: Record<string, unknown>) =>
    id ? extractionTemplatesService.update(id, payload) : extractionTemplatesService.create(payload)
  );

  const onSave = async () => {
    if (!name.trim()) {
      push({ tone: 'error', title: t('adminNew.templates.nameRequired') });
      return;
    }
    try {
      await save.mutate({
        name: name.trim(),
        document_type: documentType || undefined,
        supplier_email: supplierEmail || undefined,
        match_keywords: keywords
          ? keywords.split(',').map((k) => k.trim()).filter(Boolean)
          : undefined,
        field_zones: zones,
      });
      push({ tone: 'success', title: t('adminNew.templates.saved') });
      router.push(`/${locale}/admin/facturen/templates`);
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  if (id && existing.loading) {
    return (
      <AdminContent>
        <LoadingState label={t('adminNew.common.loading')} />
      </AdminContent>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={id ? t('adminNew.templates.editTitle') : t('adminNew.templates.new')}
        subtitle={t('adminNew.templates.editorSubtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/facturen/templates`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            <Button variant="gold" size="sm" disabled={save.loading} onClick={() => void onSave()}>
              {t('adminNew.common.save')}
            </Button>
          </div>
        }
      />
      <AdminContent>
        <AdminSectionCard title={t('adminNew.templates.detailsTitle')} icon={ScanText}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('adminNew.templates.fieldsMeta.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.templates.fieldsMeta.documentType')}
              </label>
              <select
                className="input-base w-full"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="purchase_invoice">{t('adminNew.templates.docTypes.purchase_invoice')}</option>
                <option value="delivery_note">{t('adminNew.templates.docTypes.delivery_note')}</option>
                <option value="credit_note">{t('adminNew.templates.docTypes.credit_note')}</option>
                <option value="quote">{t('adminNew.templates.docTypes.quote')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.templates.fieldsMeta.supplierEmail')}
              type="email"
              value={supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
              placeholder="supplier@example.com"
            />
            <Input
              label={t('adminNew.templates.fieldsMeta.keywords')}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={t('adminNew.templates.keywordsPlaceholder')}
            />
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.templates.zonesTitle')}
          description={t('adminNew.templates.zonesSubtitle')}
          icon={ScanText}
          className="mt-5"
        >
          <DocumentZoneEditor zones={zones} onChange={setZones} sourceUrl={sourceUrl} />
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}

export default function TemplateEditorPage() {
  return (
    <React.Suspense fallback={<AdminContent><LoadingState label="…" /></AdminContent>}>
      <EditorInner />
    </React.Suspense>
  );
}
