'use client';

import * as React from 'react';
import { Ban, LogIn, Plus, ShieldCheck, Users } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminLinkButton,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService } from '@/lib/services';
import { impersonateCustomer, ImpersonationError } from '@/lib/impersonate';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function CustomersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [query, setQuery] = React.useState('');
  const [language, setLanguage] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', phone: '' });
  const [blockTarget, setBlockTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [blockReason, setBlockReason] = React.useState('');
  const [impersonateTarget, setImpersonateTarget] = React.useState<{ id: string; name: string } | null>(
    null
  );

  const customers = useQuery([query, language, status, page], () =>
    customersService.list({
      search: query || undefined,
      language: language || undefined,
      status: status || undefined,
      blocked: status === 'blocked' ? true : undefined,
      page,
      per_page: 20,
    })
  );

  const createCustomer = useMutation(customersService.create);
  const blockCustomer = useMutation((p: { id: string; reason?: string }) =>
    customersService.block(p.id, p.reason)
  );
  const unblockCustomer = useMutation((id: string) => customersService.unblock(id));

  const onUnblock = async (id: string) => {
    try {
      await unblockCustomer.mutate(id);
      push({ tone: 'success', title: t('adminNew.customers.toasts.unblocked') });
      await customers.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onImpersonate = async (id: string) => {
    try {
      await impersonateCustomer(id, locale);
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.impersonation.failed'),
        message: err instanceof ImpersonationError ? err.message : getApiErrorMessage(err),
      });
    }
  };

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
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <AdminSearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder={t('adminNew.customers.searchPlaceholder')}
            className="flex-1"
          />
          <AdminSelect
            value={language}
            onChange={(value) => {
              setLanguage(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.customers.allLanguages')}</option>
            <option value="nl">NL</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
          </AdminSelect>
          <AdminSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.customers.allStatuses')}</option>
            <option value="active">{t('adminNew.customers.statusActive')}</option>
            <option value="blocked">{t('adminNew.customers.statusBlocked')}</option>
          </AdminSelect>
        </div>

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
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.customers.columns.lastLogin')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {customers.data?.data.map((customer) => {
                  const blocked = customer.is_blocked || customer.status === 'blocked';
                  const lastLogin = customer.last_login_at ?? customer.last_active_at;
                  return (
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
                    <AdminTableCell>
                      <Badge tone={blocked ? 'danger' : 'success'}>
                        {blocked
                          ? t('adminNew.customers.statusBlocked')
                          : t('adminNew.customers.statusActive')}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                      {lastLogin ? new Date(lastLogin).toLocaleDateString(dateLocale) : '—'}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<LogIn className="h-3.5 w-3.5" />}
                          onClick={() => setImpersonateTarget({ id: customer.id, name: customer.name })}
                        >
                          {t('adminNew.customers.impersonate')}
                        </Button>
                        {blocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                            disabled={unblockCustomer.loading}
                            onClick={() => void onUnblock(customer.id)}
                          >
                            {t('adminNew.customers.unblock')}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Ban className="h-3.5 w-3.5" />}
                            onClick={() => setBlockTarget({ id: customer.id, name: customer.name })}
                          >
                            {t('adminNew.customers.block')}
                          </Button>
                        )}
                        <AdminLinkButton href={`/${locale}/admin/klanten/${customer.id}`}>
                          {t('adminNew.customers.details')}
                        </AdminLinkButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                  );
                })}
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

      <Modal open={!!blockTarget} onClose={() => { setBlockTarget(null); setBlockReason(''); }} size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!blockTarget) return;
            try {
              await blockCustomer.mutate({ id: blockTarget.id, reason: blockReason || undefined });
              push({ tone: 'success', title: t('adminNew.customers.toasts.blocked') });
              await customers.refetch();
            } catch (err) {
              push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
            }
            setBlockTarget(null);
            setBlockReason('');
          }}
          className="p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
            <Ban className="h-5 w-5 text-rose-500" />
            {t('adminNew.customers.block')}
          </h2>
          <p className="mt-2 text-sm text-navy-600">
            {t('adminNew.customers.confirmBlock', { name: blockTarget?.name ?? '' })}
          </p>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.customers.blockReason')}
            </label>
            <textarea
              className="input-base min-h-20 w-full"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder={t('adminNew.customers.blockReasonPlaceholder')}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setBlockTarget(null); setBlockReason(''); }}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="danger" disabled={blockCustomer.loading}>
              {t('adminNew.customers.block')}
            </Button>
          </div>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
        onConfirm={async () => {
          if (!impersonateTarget) return;
          await onImpersonate(impersonateTarget.id);
          setImpersonateTarget(null);
        }}
        title={t('adminNew.customers.impersonate')}
        message={t('adminNew.impersonation.confirmMessage', { name: impersonateTarget?.name ?? '' })}
        confirmLabel={t('adminNew.customers.impersonate')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={LogIn}
      />
    </>
  );
}
