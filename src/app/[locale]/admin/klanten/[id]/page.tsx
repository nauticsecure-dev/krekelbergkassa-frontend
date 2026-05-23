'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FilePlus2, Save, Ship } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
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
      />

      <div className="space-y-5 px-4 py-6 sm:px-6">
        {data.loading ? (
          <LoadingState label={t('adminNew.customerDetail.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}
        {!data.loading && !data.error && !data.data ? <EmptyState /> : null}

        {!data.loading && data.data ? (
          <>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.customerDetail.infoTitle')}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label={t('adminNew.common.name')} value={data.data.customer.name} />
                  <Info
                    label={t('adminNew.common.email')}
                    value={data.data.customer.email ?? '-'}
                  />
                  <Info
                    label={t('adminNew.common.phone')}
                    value={data.data.customer.phone ?? '-'}
                  />
                  <Info
                    label={t('adminNew.customerDetail.preferredLocale')}
                    value={data.data.customer.preferred_locale}
                  />
                  <Info
                    label={t('adminNew.customerDetail.company')}
                    value={data.data.customer.company_name ?? '-'}
                  />
                  <Info
                    label={t('adminNew.customerDetail.vatNumber')}
                    value={data.data.customer.vat_number ?? '-'}
                  />
                </div>
                <div className="mt-4 rounded-lg border border-navy-100 bg-sand-50 p-3 text-sm text-navy-700">
                  <div className="font-medium text-navy-900">{t('adminNew.customerDetail.notes')}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">
                    {data.data.customer.notes ?? t('adminNew.customerDetail.noNotes')}
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.customerDetail.summaryTitle')}
                </div>
                <div className="mt-3 space-y-2 text-sm text-navy-700">
                  <Summary label={t('adminNew.customerDetail.boats')} value={String(boatsCount)} />
                  <Summary
                    label={t('adminNew.customerDetail.stallingContracts')}
                    value={String(stallingCount)}
                  />
                  <Summary
                    label={t('adminNew.customerDetail.invoices')}
                    value={String(invoiceCount)}
                  />
                  <Summary
                    label={t('adminNew.customerDetail.openBalance')}
                    value={formatCurrency(
                      openBalance,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                  />
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.customerDetail.boats')}
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3">{t('adminNew.customerDetail.table.boats.name')}</th>
                      <th className="px-4 py-3">{t('adminNew.customerDetail.table.boats.type')}</th>
                      <th className="px-4 py-3">{t('adminNew.customerDetail.table.boats.length')}</th>
                      <th className="px-4 py-3">{t('adminNew.customerDetail.table.boats.location')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {data.data.boats.length ? (
                      data.data.boats.map((boat) => (
                        <tr key={boat.id} className="hover:bg-sand-50">
                          <td className="px-4 py-3 font-medium text-navy-900">{boat.name}</td>
                          <td className="px-4 py-3 capitalize">{boat.type}</td>
                          <td className="px-4 py-3">
                            {boat.length_cm ? `${boat.length_cm} cm` : '-'}
                          </td>
                          <td className="px-4 py-3">{boat.location_code ?? '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-navy-500" colSpan={4}>
                          {t('adminNew.customerDetail.noBoats')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="overflow-hidden">
                <div className="border-b border-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">
                  {t('adminNew.customerDetail.invoices')}
                </div>
                <div className="divide-y divide-navy-100">
                  {data.data.invoices.length ? (
                    data.data.invoices.slice(0, 10).map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/${locale}/admin/facturen/${invoice.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-sand-50"
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
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">
                  {t('adminNew.customerDetail.stallingContracts')}
                </div>
                <div className="divide-y divide-navy-100">
                  {data.data.stalling.length ? (
                    data.data.stalling.slice(0, 10).map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between px-4 py-3">
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
              </Card>
            </div>

            <Card className="p-5">
              <div className="text-sm font-semibold text-navy-900">
                {t('adminNew.customerDetail.files')}
              </div>
              {data.data.files.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.data.files.map((file, idx) => (
                    <div
                      key={String(file.id ?? idx)}
                      className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
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
                <div className="mt-2 text-sm text-navy-500">
                  {t('adminNew.customerDetail.noFiles')}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2">
      <div className="text-xs text-navy-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-navy-900">{value}</span>
    </div>
  );
}
