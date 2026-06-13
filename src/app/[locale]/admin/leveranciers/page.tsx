'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, Eye, Plus, Receipt } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSearchInput,
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
import { suppliersService } from '@/lib/services';
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

const EMPTY = { name: '', email: '', phone: '', vat_number: '', payment_terms_days: '', default_ledger_account: '' };

export default function SuppliersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY);

  const suppliers = useQuery([search, page], () =>
    suppliersService.list({ search: search || undefined, page, per_page: 50 })
  );
  const createM = useMutation((p: Rec) => suppliersService.create(p));
  const updateM = useMutation((p: { id: string; body: Rec }) => suppliersService.update(p.id, p.body));

  const rows = (suppliers.data?.data ?? []) as Rec[];
  const meta = suppliers.data?.meta;

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (row: Rec) => {
    setEditId(String(row.id));
    setForm({
      name: str(row, 'name'),
      email: str(row, 'email'),
      phone: str(row, 'phone'),
      vat_number: str(row, 'vat_number'),
      payment_terms_days: str(row, 'payment_terms_days'),
      default_ledger_account: str(row, 'default_ledger_account', 'ledger_account'),
    });
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Rec = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      vat_number: form.vat_number || undefined,
      payment_terms_days: form.payment_terms_days ? Number(form.payment_terms_days) : undefined,
      default_ledger_account: form.default_ledger_account || undefined,
    };
    try {
      if (editId) await updateM.mutate({ id: editId, body: payload });
      else await createM.mutate(payload);
      push({ tone: 'success', title: t(editId ? 'adminNew.suppliers.toasts.updated' : 'adminNew.suppliers.toasts.created') });
      setShowForm(false);
      await suppliers.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.suppliers.title')}
        subtitle={t('adminNew.suppliers.subtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/boekhouding`}>
              <Button variant="outline" size="sm" leftIcon={<Receipt className="h-4 w-4" />}>
                {t('adminNew.accounting.title')}
              </Button>
            </Link>
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              {t('adminNew.suppliers.new')}
            </Button>
          </div>
        }
      />
      <AdminContent>
        <AdminSectionCard title={t('adminNew.suppliers.listTitle')} icon={Building2}>
          <div className="mb-4">
            <AdminSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminNew.suppliers.searchPlaceholder')} />
          </div>
          <AdminTableCard>
            {suppliers.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : suppliers.error ? (
              <ErrorState message={suppliers.error} onRetry={() => void suppliers.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState title={t('adminNew.suppliers.emptyTitle')} message={t('adminNew.suppliers.emptyMessage')} />
            ) : (
              <AdminTable minWidth={820}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.columns.contact')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.columns.vat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.suppliers.columns.terms')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => {
                    const id = String(row.id);
                    return (
                      <AdminTableRow key={id}>
                        <AdminTableCell className="font-medium text-navy-900">{str(row, 'name') || '—'}</AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">
                          {str(row, 'email') || '—'}
                          {str(row, 'phone') ? <div className="text-xs text-navy-400">{str(row, 'phone')}</div> : null}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm">{str(row, 'vat_number') || '—'}</AdminTableCell>
                        <AdminTableCell className="text-sm">
                          {str(row, 'payment_terms_days') ? t('adminNew.suppliers.termDays', { days: str(row, 'payment_terms_days') }) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                              {t('adminNew.common.edit')}
                            </Button>
                            <Link href={`/${locale}/admin/leveranciers/${id}`}>
                              <Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />}>
                                {t('adminNew.common.open')}
                              </Button>
                            </Link>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
          {meta && (meta.last_page ?? 1) > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button>
              <span className="text-xs text-navy-500">{page} / {meta.last_page ?? 1}</span>
              <Button size="sm" variant="ghost" disabled={page >= (meta.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>→</Button>
            </div>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showForm} onClose={() => setShowForm(false)} size="md">
        <form onSubmit={onSubmit}>
          <AdminModalHeader
            title={t(editId ? 'adminNew.suppliers.editTitle' : 'adminNew.suppliers.new')}
            subtitle={t('adminNew.suppliers.formSubtitle')}
          />
          <AdminModalBody>
            <Input label={t('adminNew.suppliers.columns.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('adminNew.suppliers.fields.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label={t('adminNew.suppliers.fields.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('adminNew.suppliers.columns.vat')} value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
              <Input label={t('adminNew.suppliers.fields.paymentTerms')} type="number" value={form.payment_terms_days} onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })} />
            </div>
            <Input label={t('adminNew.suppliers.fields.ledgerAccount')} value={form.default_ledger_account} onChange={(e) => setForm({ ...form, default_ledger_account: e.target.value })} placeholder={t('adminNew.suppliers.fields.ledgerAccountPlaceholder')} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createM.loading || updateM.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
