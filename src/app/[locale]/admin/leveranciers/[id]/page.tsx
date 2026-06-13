'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, Link2, Plus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { productsService, suppliersService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">{label}</div>
      <div className="mt-0.5 font-medium text-navy-900">{value || '—'}</div>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);

  const [showMap, setShowMap] = React.useState(false);
  const [mapForm, setMapForm] = React.useState({ supplier_sku: '', supplier_description: '', product_id: '' });

  const supplier = useQuery([id], () => suppliersService.get(id));
  const mappings = useQuery([id, 'mappings'], () => suppliersService.mappings(id));
  const products = useQuery(['products-all'], () => productsService.list({ per_page: 200 }).catch(() => null));
  const createMap = useMutation((p: Rec) => suppliersService.createMapping(id, p));

  const data = (supplier.data ?? {}) as Rec;
  const mapRows = (mappings.data ?? []) as Rec[];
  const productOptions = ((products.data?.data ?? []) as unknown as Rec[]) ?? [];

  const onCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMap.mutate({
        supplier_sku: mapForm.supplier_sku || undefined,
        supplier_description: mapForm.supplier_description || undefined,
        product_id: mapForm.product_id || undefined,
      });
      push({ tone: 'success', title: t('adminNew.suppliers.toasts.mappingCreated') });
      setShowMap(false);
      setMapForm({ supplier_sku: '', supplier_description: '', product_id: '' });
      await mappings.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={str(data, 'name') || t('adminNew.suppliers.title')}
        subtitle={str(data, 'email')}
        rightSlot={
          <Link href={`/${locale}/admin/leveranciers`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
        stats={[
          { label: t('adminNew.suppliers.columns.vat'), value: str(data, 'vat_number') || '—', icon: Building2, tone: 'navy', loading: supplier.loading },
          { label: t('adminNew.suppliers.columns.terms'), value: str(data, 'payment_terms_days') ? t('adminNew.suppliers.termDays', { days: str(data, 'payment_terms_days') }) : '—', tone: 'marine' },
          { label: t('adminNew.suppliers.mappingsTitle'), value: mapRows.length, icon: Link2, tone: 'gold' },
        ]}
      />
      <AdminContent>
        {supplier.error ? <ErrorState message={supplier.error} onRetry={() => void supplier.refetch()} /> : null}

        <AdminSectionCard title={t('adminNew.suppliers.detailsTitle')} icon={Building2}>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Field label={t('adminNew.suppliers.fields.email')} value={str(data, 'email')} />
            <Field label={t('adminNew.suppliers.fields.phone')} value={str(data, 'phone')} />
            <Field label={t('adminNew.suppliers.columns.vat')} value={str(data, 'vat_number')} />
            <Field label={t('adminNew.suppliers.fields.paymentTerms')} value={str(data, 'payment_terms_days')} />
            <Field label={t('adminNew.suppliers.fields.ledgerAccount')} value={str(data, 'default_ledger_account', 'ledger_account')} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.suppliers.mappingsTitle')}
          description={t('adminNew.suppliers.mappingsSubtitle')}
          icon={Link2}
          className="mt-5"
          action={
            <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowMap(true)}>
              {t('adminNew.suppliers.addMapping')}
            </Button>
          }
        >
          <AdminTableCard>
            {mappings.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : mapRows.length === 0 ? (
              <EmptyState title={t('adminNew.suppliers.mappingsEmptyTitle')} message={t('adminNew.suppliers.mappingsEmptyMessage')} />
            ) : (
              <AdminTable minWidth={680}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.mapColumns.sku')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.mapColumns.description')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.mapColumns.product')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {mapRows.map((row, i) => (
                    <AdminTableRow key={str(row, 'id') || i}>
                      <AdminTableCell className="font-medium text-navy-900">{str(row, 'supplier_sku') || '—'}</AdminTableCell>
                      <AdminTableCell className="text-sm text-navy-600">{str(row, 'supplier_description') || '—'}</AdminTableCell>
                      <AdminTableCell className="text-sm">
                        {str(row, 'product_name') || str((row.product as Rec) ?? {}, 'name') || str(row, 'product_id') || '—'}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showMap} onClose={() => setShowMap(false)} size="md">
        <form onSubmit={onCreateMapping}>
          <AdminModalHeader title={t('adminNew.suppliers.addMapping')} subtitle={t('adminNew.suppliers.mappingsSubtitle')} />
          <AdminModalBody>
            <Input label={t('adminNew.suppliers.mapColumns.sku')} value={mapForm.supplier_sku} onChange={(e) => setMapForm({ ...mapForm, supplier_sku: e.target.value })} />
            <Input label={t('adminNew.suppliers.mapColumns.description')} value={mapForm.supplier_description} onChange={(e) => setMapForm({ ...mapForm, supplier_description: e.target.value })} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.suppliers.mapColumns.product')}</label>
              <select className="input-base w-full" value={mapForm.product_id} onChange={(e) => setMapForm({ ...mapForm, product_id: e.target.value })} required>
                <option value="">{t('adminNew.suppliers.selectProduct')}</option>
                {productOptions.map((p, i) => (
                  <option key={str(p, 'id') || i} value={str(p, 'id')}>{str(p, 'name')}</option>
                ))}
              </select>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowMap(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createMap.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
