'use client';

import * as React from 'react';
import { Plus, Shield, UserCog } from 'lucide-react';
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
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { usersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';

export default function UsersPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });

  const users = useQuery([page], () => usersService.list({ page, per_page: 20 }));
  const register = useMutation(usersService.register);
  const activate = useMutation(usersService.activate);
  const deactivate = useMutation(usersService.deactivate);

  const rows = users.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutate(form);
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      await users.refetch();
      push({ tone: 'success', title: t('adminNew.users.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.users.toasts.createFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      if (active) await deactivate.mutate(id);
      else await activate.mutate(id);
      await users.refetch();
      push({
        tone: 'success',
        title: active ? t('adminNew.users.toasts.deactivated') : t('adminNew.users.toasts.activated'),
      });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.users.title')}
        subtitle={t('adminNew.users.subtitle')}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.users.title')}
          description={t('adminNew.users.subtitle')}
          icon={UserCog}
          action={
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.users.new')}
            </Button>
          }
        >
        <AdminTableCard>
          {users.loading ? (
            <LoadingState label={t('adminNew.users.loading')} />
          ) : users.error ? (
            <ErrorState message={users.error} onRetry={() => void users.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.users.emptyTitle')} message={t('adminNew.users.emptyMessage')} />
          ) : (
            <>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('adminNew.users.columns.user')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.users.columns.role')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.users.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.users.columns.lastLogin')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={row.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-marine-600" />
                          <div>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-navy-400">{row.email}</div>
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <Badge tone="neutral">
                          <Shield className="mr-1 inline h-3 w-3" />
                          {row.role}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <Badge tone={row.active ? 'success' : 'danger'}>
                          {row.active ? t('adminNew.users.active') : t('adminNew.users.inactive')}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {row.last_login_at ? formatDate(row.last_login_at, dateLocale) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>
                        <Button size="sm" variant="ghost" onClick={() => void toggleActive(row.id, row.active)}>
                          {row.active ? t('adminNew.users.deactivate') : t('adminNew.users.activate')}
                        </Button>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.users.total', {
                  count: users.data?.meta?.total ?? rows.length,
                })}
                meta={users.data?.meta}
                onPageChange={setPage}
              />
            </>
          )}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.users.modal.title')} subtitle={t('adminNew.users.modal.subtitle')} />
          <AdminModalBody>
            <div className="space-y-4">
            <Input label={t('adminNew.common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t('adminNew.common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label={t('adminNew.users.fields.password')} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy-700">{t('adminNew.users.columns.role')}</span>
              <select className="input-base" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </label>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={register.loading}>
              {register.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
