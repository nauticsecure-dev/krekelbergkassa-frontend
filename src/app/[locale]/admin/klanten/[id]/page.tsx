'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FilePlus2, Save, Ship, Users, Warehouse, CreditCard } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminDetailGrid,
  AdminPanel,
  AdminStatusStrip,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { InvoiceStatusBadge } from '@/components/admin/StatusBadge';
import {
  boatsService,
  customersService,
  filesService,
  invoicesService,
  stallingService,
} from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id;
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [showEdit, setShowEdit] = React.useState(false);
  const [showBoat, setShowBoat] = React.useState(false);

  const data = useQuery([customerId], async () => {
    if (!customerId) throw new Error('Missing customer id');
    const [customer, boats, stalling, invoices, files] = await Promise.all([
      customersService.get(customerId),
      boatsService.list({ customer_id: customerId, per_page: 100 }),
      stallingService.list({ customer_id: customerId, per_page: 100 }),
      invoicesService.list({ customer_id: customerId, per_page: 100 }),
      filesService
        .list({ entity_type: 'customer', entity_id: customerId, per_page: 100 })
        .catch(() => ({ data: [] })),
    ]);

    return {
      customer,
      boats: boats.data,
      stalling: stalling.data,
      invoices: invoices.data,
      files: files.data,
    };
  });

  const updateCustomer = useMutation((payload: Record<string, unknown>) =>
    customersService.update(customerId, payload)
  );
  const createBoat = useMutation((payload: Record<string, unknown>) =>
    boatsService.create(payload)
  );
  const createInvoice = useMutation(() =>
    invoicesService.create({
      customer_id: customerId,
      source: 'manual',
      lines: [
        {
          description: t('adminNew.customerDetail.defaultInvoiceLine'),
          quantity: 1,
          unit_price: 0,
          vat_rate: 21,
        },
      ],
    })
  );

  const [editForm, setEditForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    preferred_locale: 'nl-NL',
    notes: '',
  });

  const [boatForm, setBoatForm] = React.useState({
    name: '',
    type: 'motor',
    length_cm: '',
    location_code: '',
  });

  React.useEffect(() => {
    if (!data.data?.customer) return;
    setEditForm({
      name: data.data.customer.name,
      email: data.data.customer.email ?? '',
      phone: data.data.customer.phone ?? '',
      preferred_locale: data.data.customer.preferred_locale || 'nl-NL',
      notes: data.data.customer.notes ?? '',
    });
  }, [data.data?.customer]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCustomer.mutate({
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        preferred_locale: editForm.preferred_locale,
        notes: editForm.notes || null,
      });
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.customerUpdated') });
      setShowEdit(false);
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.saveFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCreateBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoat.mutate({
        customer_id: customerId,
        name: boatForm.name,
        type: boatForm.type,
        length_cm: boatForm.length_cm ? Number(boatForm.length_cm) : null,
        location_code: boatForm.location_code || null,
      });
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.boatAdded') });
      setShowBoat(false);
      setBoatForm({ name: '', type: 'motor', length_cm: '', location_code: '' });
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.createFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onCreateInvoice = async () => {
    try {
      const invoice = await createInvoice.mutate();
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.invoiceCreated') });
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.invoiceCreateFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const invoiceCount = data.data?.invoices.length ?? 0;
  const stallingCount = data.data?.stalling.length ?? 0;
  const boatsCount = data.data?.boats.length ?? 0;
  const openBalance =
    data.data?.invoices.reduce((sum, inv) => sum + inv.outstanding_cents / 100, 0) ?? 0;

  return (
    <>
      <AdminPageHeader
        title={data.data?.customer.name ?? t('adminNew.customerDetail.fallbackTitle')}
        subtitle={data.data?.customer.customer_number}
        rightSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => setShowEdit(true)}
            >
              {t('adminNew.customerDetail.actions.editCustomer')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<FilePlus2 className="h-4 w-4" />}
              onClick={onCreateInvoice}
            >
              {t('adminNew.customerDetail.actions.newInvoice')}
            </Button>
          </>
        }
        stats={[
          {
            label: t('adminNew.customerDetail.boats'),
            value: boatsCount,
            icon: Ship,
            tone: 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.stallingContracts'),
            value: stallingCount,
            icon: Warehouse,
            tone: 'gold',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.invoices'),
            value: invoiceCount,
            icon: CreditCard,
            tone: 'navy',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.openBalance'),
            value: formatCurrency(openBalance, locale === 'en' ? 'en-GB' : 'nl-NL'),
            icon: Users,
            tone: openBalance > 0 ? 'warning' : 'success',
            loading: data.loading,
          },
        ]}
      />

      <AdminContent>
        {data.loading ? (
          <LoadingState label={t('adminNew.customerDetail.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}
        {!data.loading && !data.error && !data.data ? <EmptyState /> : null}

        {!data.loading && data.data ? (
          <>
            <div className="bento-grid lg:grid-cols-3">
              <AdminPanel
                className="lg:col-span-2"
                title={t('adminNew.customerDetail.infoTitle')}
                description={data.data.customer.customer_number}
              >
                <AdminDetailGrid
                  items={[
                    { label: t('adminNew.common.name'), value: data.data.customer.name },
                    {
                      label: t('adminNew.common.email'),
                      value: data.data.customer.email ?? '-',
                    },
                    {
                      label: t('adminNew.common.phone'),
                      value: data.data.customer.phone ?? '-',
                    },
                    {
                      label: t('adminNew.customerDetail.preferredLocale'),
                      value: data.data.customer.preferred_locale,
                    },
                    {
                      label: t('adminNew.customerDetail.company'),
                      value: data.data.customer.company_name ?? '-',
                    },
                    {
                      label: t('adminNew.customerDetail.vatNumber'),
                      value: data.data.customer.vat_number ?? '-',
                    },
                  ]}
                />
                <div className="mt-4 rounded-xl border border-navy-100/70 bg-sand-50/60 p-4 text-sm text-navy-700">
                  <div className="font-medium text-navy-900">{t('adminNew.customerDetail.notes')}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">
                    {data.data.customer.notes ?? t('adminNew.customerDetail.noNotes')}
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel title={t('adminNew.customerDetail.summaryTitle')}>
                <div className="space-y-2">
                  <AdminStatusStrip label={t('adminNew.customerDetail.boats')} value={boatsCount} tone="marine" />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.stallingContracts')}
                    value={stallingCount}
                    tone="gold"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.invoices')}
                    value={invoiceCount}
                    tone="navy"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.openBalance')}
                    value={formatCurrency(
                      openBalance,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                    tone={openBalance > 0 ? 'warning' : 'success'}
                  />
                </div>
              </AdminPanel>
            </div>

            <AdminTableCard>
              <div className="flex items-center justify-between border-b border-navy-100 bg-white px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-navy-900">
                    {t('adminNew.customerDetail.boats')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Ship className="h-4 w-4" />}
                  onClick={() => setShowBoat(true)}
                >
                  {t('adminNew.customerDetail.actions.addBoat')}
                </Button>
              </div>
              <AdminTable minWidth={760}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.length')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.location')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {data.data.boats.length ? (
                    data.data.boats.map((boat) => (
                      <AdminTableRow key={boat.id}>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {boat.name}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize">{boat.type}</AdminTableCell>
                        <AdminTableCell>
                          {boat.length_cm ? `${boat.length_cm} cm` : '-'}
                        </AdminTableCell>
                        <AdminTableCell>{boat.location_code ?? '-'}</AdminTableCell>
                      </AdminTableRow>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="border-t border-navy-100 px-4 py-8 text-center text-sm text-navy-500">
                        {t('adminNew.customerDetail.noBoats')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </AdminTable>
            </AdminTableCard>

            <div className="bento-grid lg:grid-cols-2">
              <AdminPanel title={t('adminNew.customerDetail.invoices')}>
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {data.data.invoices.length ? (
                    data.data.invoices.slice(0, 10).map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/${locale}/admin/facturen/${invoice.id}`}
                        className="flex items-center justify-between px-4 py-3 transition hover:bg-sand-50/80"
                      >
                        <div>
                          <div className="font-medium text-navy-900">{invoice.invoice_number}</div>
                          <div className="text-xs text-navy-500">
                            {t('adminNew.customerDetail.dueDate')}:{' '}
                            {formatDate(invoice.due_date)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-navy-900">
                            {formatCurrency(
                              invoice.total_amount_euros,
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                          </div>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.customerDetail.noInvoices')}
                    </div>
                  )}
                </div>
              </AdminPanel>

              <AdminPanel title={t('adminNew.customerDetail.stallingContracts')}>
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {data.data.stalling.length ? (
                    data.data.stalling.slice(0, 10).map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-navy-900">{contract.contract_number}</div>
                          <div className="text-xs text-navy-500">
                            {contract.type} · {formatDate(contract.start_date)} -{' '}
                            {formatDate(contract.end_date)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-navy-900">
                          {formatCurrency(
                            contract.open_balance_cents / 100,
                            locale === 'en' ? 'en-GB' : 'nl-NL'
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.customerDetail.noContracts')}
                    </div>
                  )}
                </div>
              </AdminPanel>
            </div>

            <AdminPanel title={t('adminNew.customerDetail.files')}>
              {data.data.files.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.data.files.map((file, idx) => (
                    <div
                      key={String(file.id ?? idx)}
                      className="rounded-xl border border-navy-100/70 bg-sand-50/40 px-3 py-2.5 text-sm"
                    >
                      <div className="font-medium text-navy-900">
                        {String(
                          file.original_name ?? file.name ?? `${t('adminNew.customerDetail.file')} ${idx + 1}`
                        )}
                      </div>
                      <div className="text-xs text-navy-500">{String(file.mime_type ?? '')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.customerDetail.noFiles')}</div>
              )}
            </AdminPanel>
          </>
        ) : null}
      </AdminContent>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} size="md">
        <form onSubmit={handleSaveCustomer} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.customerDetail.modals.editTitle')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.common.name')}
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('adminNew.common.email')}
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              label={t('adminNew.common.phone')}
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <Input
              label={t('adminNew.customerDetail.preferredLocale')}
              value={editForm.preferred_locale}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, preferred_locale: e.target.value }))
              }
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.notes')}
              </label>
              <textarea
                className="input-base min-h-24"
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={updateCustomer.loading}>
              {updateCustomer.loading
                ? t('adminNew.common.saving')
                : t('adminNew.common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBoat} onClose={() => setShowBoat(false)} size="md">
        <form onSubmit={handleCreateBoat} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.customerDetail.modals.addBoatTitle')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.common.name')}
              value={boatForm.name}
              onChange={(e) => setBoatForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.boatType')}
              </label>
              <select
                className="input-base"
                value={boatForm.type}
                onChange={(e) => setBoatForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="motor">{t('adminNew.boats.type.motor')}</option>
                <option value="sail">{t('adminNew.boats.type.sail')}</option>
                <option value="rib">RIB</option>
                <option value="trailer">Trailer</option>
                <option value="other">{t('adminNew.boats.type.other')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.customerDetail.lengthCm')}
              value={boatForm.length_cm}
              onChange={(e) => setBoatForm((p) => ({ ...p, length_cm: e.target.value }))}
            />
            <Input
              label={t('adminNew.customerDetail.locationCode')}
              value={boatForm.location_code}
              onChange={(e) =>
                setBoatForm((p) => ({ ...p, location_code: e.target.value }))
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowBoat(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createBoat.loading}>
              {createBoat.loading
                ? t('adminNew.common.saving')
                : t('adminNew.customerDetail.actions.addBoat')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
