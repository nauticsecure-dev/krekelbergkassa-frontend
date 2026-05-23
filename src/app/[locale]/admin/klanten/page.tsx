'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { Pagination } from '@/components/admin/Pagination';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function CustomersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', phone: '' });

  const customers = useQuery([query, page], () =>
    customersService.list({ search: query || undefined, page, per_page: 20 })
  );

  const createCustomer = useMutation(customersService.create);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createCustomer.mutate({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      push({ tone: 'success', title: t('adminNew.customers.toasts.created') });
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '' });
      await customers.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customers.toasts.createFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.customers.title')}
        subtitle={t('adminNew.customers.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            {t('adminNew.customers.new')}
          </Button>
        }
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
                placeholder={t('adminNew.customers.searchPlaceholder')}
                className="input-base pl-9"
              />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {customers.loading ? <LoadingState label={t('adminNew.customers.loading')} variant="table" /> : null}
          {!customers.loading && customers.error ? (
            <ErrorState message={customers.error} onRetry={() => void customers.refetch()} />
          ) : null}
          {!customers.loading && !customers.error && customers.data?.data.length === 0 ? (
            <EmptyState
              title={t('adminNew.customers.emptyTitle')}
              message={t('adminNew.customers.emptyMessage')}
              action={
                <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                  {t('adminNew.customers.new')}
                </Button>
              }
            />
          ) : null}

          {!customers.loading && !customers.error && (customers.data?.data.length ?? 0) > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('adminNew.customers.columns.customer')}</th>
                      <th className="px-4 py-3 font-semibold">{t('adminNew.customers.columns.contact')}</th>
                      <th className="px-4 py-3 font-semibold">{t('adminNew.customers.columns.locale')}</th>
                      <th className="px-4 py-3 font-semibold">{t('adminNew.customers.columns.boats')}</th>
                      <th className="px-4 py-3 font-semibold">{t('adminNew.customers.columns.created')}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {customers.data?.data.map((customer) => (
                      <tr key={customer.id} className="hover:bg-sand-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-navy-900">{customer.name}</div>
                          <div className="text-xs text-navy-500">{customer.customer_number}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{customer.email ?? '-'}</div>
                          <div className="text-xs text-navy-500">{customer.phone ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3 uppercase">{customer.preferred_locale || '-'}</td>
                        <td className="px-4 py-3">{customer.boats_count ?? 0}</td>
                        <td className="px-4 py-3">{new Date(customer.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/${locale}/admin/klanten/${customer.id}`}
                            className="text-sm font-semibold text-marine-700 hover:text-marine-800"
                          >
                            {t('adminNew.customers.details')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/50 px-4 py-3 text-xs text-navy-500">
                <span>
                  {customers.data?.meta?.total
                    ? t('adminNew.customers.total', { count: customers.data.meta.total })
                    : t('adminNew.customers.results', { count: customers.data?.data.length ?? 0 })}
                </span>
                <Pagination meta={customers.data?.meta} onChange={setPage} />
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={submitCreate} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.customers.modal.title')}</h2>
          <p className="mt-1 text-sm text-navy-500">{t('adminNew.customers.modal.subtitle')}</p>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.common.name')}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label={t('adminNew.common.email')}
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              label={t('adminNew.common.phone')}
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createCustomer.loading}>
              {createCustomer.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
