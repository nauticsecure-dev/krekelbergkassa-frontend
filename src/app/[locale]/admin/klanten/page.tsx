'use client';

import * as React from 'react';
import { Plus, Users } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminLinkButton,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSearchInput,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

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
        message: getApiErrorMessage(err),
      });
    }
  };

  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const rows = customers.data?.data ?? [];
  const total = customers.data?.meta?.total ?? rows.length;
  const withEmail = rows.filter((c) => c.email).length;

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.sidebar.customers')}
        title={t('adminNew.customers.title')}
        subtitle={t('adminNew.customers.subtitle')}
        stats={[
          {
            label: t('adminNew.customers.total', { count: total }),
            value: total,
            icon: Users,
            tone: 'marine',
            loading: customers.loading,
          },
          {
            label: t('adminNew.customers.results', { count: rows.length }),
            value: rows.length,
            tone: 'navy',
            loading: customers.loading,
          },
          {
            label: t('adminNew.common.email'),
            value: withEmail,
            tone: 'gold',
            loading: customers.loading,
          },
          {
            label: t('admin.common.search'),
            value: query || '—',
            tone: 'success',
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.customers.title')}
          description={t('adminNew.customers.subtitle')}
          icon={Users}
          action={
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.customers.new')}
            </Button>
          }
        >
        <AdminSearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder={t('adminNew.customers.searchPlaceholder')}
          className="mb-4"
        />

        <AdminTableCard
          footer={
            (customers.data?.data.length ?? 0) > 0 ? (
              <AdminTableFooter
                summary={
                  customers.data?.meta?.total
                    ? t('adminNew.customers.total', { count: customers.data.meta.total })
                    : t('adminNew.customers.results', { count: customers.data?.data.length ?? 0 })
                }
                meta={customers.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
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
            <AdminTable minWidth={880}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.customer')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.contact')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.locale')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.boats')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.created')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {customers.data?.data.map((customer) => (
                  <AdminTableRow key={customer.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-navy-900">{customer.name}</div>
                      <div className="text-xs text-navy-500">{customer.customer_number}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div>{customer.email ?? '—'}</div>
                      <div className="text-xs text-navy-500">{customer.phone ?? '—'}</div>
                    </AdminTableCell>
                    <AdminTableCell className="uppercase">{customer.preferred_locale || '—'}</AdminTableCell>
                    <AdminTableCell>{customer.boats_count ?? 0}</AdminTableCell>
                    <AdminTableCell>
                      {new Date(customer.created_at).toLocaleDateString(dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <AdminLinkButton href={`/${locale}/admin/klanten/${customer.id}`}>
                        {t('adminNew.customers.details')}
                      </AdminLinkButton>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={submitCreate}>
          <AdminModalHeader
            title={t('adminNew.customers.modal.title')}
            subtitle={t('adminNew.customers.modal.subtitle')}
          />
          <AdminModalBody>
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
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createCustomer.loading}>
              {createCustomer.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
