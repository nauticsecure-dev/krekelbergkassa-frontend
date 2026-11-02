'use client';

import { TranslatedText } from '@/components/cms/TranslatedText';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import { Ban, Pencil, Plus, Shield, ShieldCheck, UserCog, UserRound, UserX } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
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
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { usersService } from '@/lib/services';
import { canImpersonateUser, impersonateUser, ImpersonationError } from '@/lib/impersonate';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate, intlLocale } from '@/lib/format';

export default function UsersPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [localeFilter, setLocaleFilter] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    gender: '',
    locale: '',
    phone: '',
  });
  const [editTarget, setEditTarget] = React.useState<{ id: string } | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    gender: '',
    locale: '',
  });
  const [deactivateTarget, setDeactivateTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [blockTarget, setBlockTarget] = React.useState<{ id: string; name: string; isBlocked: boolean } | null>(null);
  const [blockReason, setBlockReason] = React.useState('');
  const [impersonateTarget, setImpersonateTarget] = React.useState<{ id: string; name: string } | null>(null);

  const users = useQuery([page, search, roleFilter, statusFilter, localeFilter], () =>
    usersService.list({
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      locale: localeFilter || undefined,
      page,
      per_page: 20,
    })
  );
  const register = useMutation(usersService.register);
  const activate = useMutation(usersService.activate);
  const deactivate = useMutation(usersService.deactivate);
  const updateUser = useMutation((payload: { id: string; data: Record<string, unknown> }) =>
    usersService.update(payload.id, payload.data)
  );
  const blockUser = useMutation(({ id, reason }: { id: string; reason?: string }) =>
    usersService.block(id, reason)
  );
  const unblockUser = useMutation((id: string) => usersService.unblock(id));

  const rows = users.data?.data ?? [];
  const dateLocale = intlLocale(locale);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.locale ? { locale: form.locale } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
      });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'staff', gender: '', locale: '', phone: '' });
      await users.refetch();
      push({ tone: 'success', title: t('adminNew.users.toasts.created') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.users.toasts.createFailed'), message: getApiErrorMessage(err) });
    }
  };

  const openEdit = (row: (typeof rows)[number]) => {
    setEditForm({
      name: row.name ?? '',
      email: row.email ?? '',
      phone: (row as unknown as Record<string, unknown>).phone as string ?? '',
      role: row.role ?? '',
      gender: (row as unknown as Record<string, unknown>).gender as string ?? '',
      locale: row.locale ?? '',
    });
    setEditTarget({ id: row.id });
  };

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateUser.mutate({
        id: editTarget.id,
        data: {
          name: editForm.name,
          email: editForm.email || undefined,
          phone: editForm.phone || null,
          role: editForm.role || undefined,
          gender: editForm.gender || null,
          locale: editForm.locale || undefined,
        },
      });
      setEditTarget(null);
      await users.refetch();
      push({ tone: 'success', title: t('adminNew.users.toasts.updated', { defaultValue: 'Gebruiker bijgewerkt' }) });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      if (active) await deactivate.mutate(id);
      else await activate.mutate(id);
      await users.refetch();
      push({ tone: 'success', title: active ? t('adminNew.users.toasts.deactivated') : t('adminNew.users.toasts.activated') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onBlock = async () => {
    if (!blockTarget) return;
    try {
      if (blockTarget.isBlocked) {
        await unblockUser.mutate(blockTarget.id);
        push({ tone: 'success', title: t('adminNew.users.toasts.unblocked', { defaultValue: 'Gebruiker gedeblokkeerd' }) });
      } else {
        await blockUser.mutate({ id: blockTarget.id, reason: blockReason || undefined });
        push({ tone: 'success', title: t('adminNew.users.toasts.blocked', { defaultValue: 'Gebruiker geblokkeerd' }) });
      }
      setBlockTarget(null);
      setBlockReason('');
      await users.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onImpersonate = async (id: string) => {
    try {
      await impersonateUser(id, locale);
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ImpersonationError ? t('adminNew.impersonation.notAllowed') : t('adminNew.impersonation.failed'),
        message: err instanceof ImpersonationError ? undefined : getApiErrorMessage(err),
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
              {<TranslatedText textKey={'adminNew.users.new'} />}
            </Button>
          }
        >
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <AdminSearchInput
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder={t('adminNew.users.searchPlaceholder')}
            className="flex-1"
          />
          <AdminSelect value={roleFilter} onChange={(value) => { setRoleFilter(value); setPage(1); }}>
            <option value="">{t('adminNew.users.allRoles')}</option>
            <option value="admin"><TranslatedText textKey="siteCopy.b62572210341d121" fallbackText={"admin"} inline={false} /></option>
            <option value="manager"><TranslatedText textKey="siteCopy.8821dd3d77119200" fallbackText={"manager"} inline={false} /></option>
            <option value="staff"><TranslatedText textKey="siteCopy.6530f4516d5d44de" fallbackText={"staff"} inline={false} /></option>
            <option value="employee"><TranslatedText textKey="siteCopy.3dbe62f00d398de9" fallbackText={"employee"} inline={false} /></option>
            <option value="finance"><TranslatedText textKey="siteCopy.07933ae8211d357c" fallbackText={"finance"} inline={false} /></option>
          </AdminSelect>
          <AdminSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <option value="">{t('adminNew.users.allStatuses')}</option>
            <option value="active">{t('adminNew.users.statusActive')}</option>
            <option value="blocked">{t('adminNew.users.statusBlocked')}</option>
            <option value="never_logged_in">{t('adminNew.users.statusNeverLoggedIn')}</option>
          </AdminSelect>
          <AdminSelect value={localeFilter} onChange={(value) => { setLocaleFilter(value); setPage(1); }}>
            <option value="">{t('adminNew.users.allLanguages')}</option>
            <option value="nl"><TranslatedText textKey="siteCopy.67603e3c12332d4a" fallbackText={"NL"} inline={false} /></option>
            <option value="en"><TranslatedText textKey="siteCopy.799b0cc02df909e0" fallbackText={"EN"} inline={false} /></option>
            <option value="de"><TranslatedText textKey="siteCopy.aa92ef2843cfc707" fallbackText={"DE"} inline={false} /></option>
          </AdminSelect>
        </div>

        <AdminTableCard>
          {users.loading ? (
            <LoadingState label={t('adminNew.users.loading')} />
          ) : users.error ? (
            <ErrorState message={users.error} onRetry={() => void users.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.users.emptyTitle')} message={t('adminNew.users.emptyMessage')} />
          ) : (
            <>
              <AdminTable minWidth={800}>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.users.columns.user'} />}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.users.columns.role'} />}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.users.columns.status'} />}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.users.columns.lastLogin'} />}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => {
                    const isBlocked = !!(row as unknown as Record<string, unknown>).is_blocked;
                    const lastLogin = row.last_login_at;
                    return (
                    <AdminTableRow key={row.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-marine-600" />
                          <div>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-navy-400">{row.email}</div>
                            {(row as unknown as Record<string, unknown>).phone ? (
                              <div className="text-xs text-navy-400">{String((row as unknown as Record<string, unknown>).phone)}</div>
                            ) : null}
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
                        <div className="flex flex-col items-start gap-1">
                          {isBlocked ? (
                            <Badge tone="danger">{<TranslatedText textKey={'adminNew.users.statusBlocked'} vars={{ defaultValue: 'Geblokkeerd' }} />}</Badge>
                          ) : (
                            <Badge tone={row.active ? 'success' : 'danger'}>
                              {row.active ? <TranslatedText textKey={'adminNew.users.active'} /> : <TranslatedText textKey={'adminNew.users.inactive'} />}
                            </Badge>
                          )}
                          {!lastLogin ? (
                            <Badge tone="warning">{<TranslatedText textKey={'adminNew.users.neverLoggedIn'} />}</Badge>
                          ) : null}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        {lastLogin ? (
                          <div className="flex flex-col">
                            <span>{formatDate(lastLogin, dateLocale)}</span>
                            {row.last_login_ip ? (
                              <span className="text-xs text-navy-400">{row.last_login_ip}</span>
                            ) : null}
                          </div>
                        ) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canImpersonateUser(row.role) ? (
                            <Button size="sm" variant="ghost" leftIcon={<UserRound className="h-3.5 w-3.5" />}
                              onClick={() => setImpersonateTarget({ id: row.id, name: row.name })}>
                              {<TranslatedText textKey={'adminNew.impersonation.action'} />}
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            onClick={() => openEdit(row)}>
                            {<TranslatedText textKey={'adminNew.common.edit'} vars={{ defaultValue: 'Bewerken' }} />}
                          </Button>
                          {isBlocked ? (
                            <Button size="sm" variant="ghost" leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                              onClick={() => setBlockTarget({ id: row.id, name: row.name, isBlocked: true })}>
                              {<TranslatedText textKey={'adminNew.users.unblock'} vars={{ defaultValue: 'Deblokkeren' }} />}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />}
                              onClick={() => { setBlockReason(''); setBlockTarget({ id: row.id, name: row.name, isBlocked: false }); }}>
                              {<TranslatedText textKey={'adminNew.users.block'} vars={{ defaultValue: 'Blokkeren' }} />}
                            </Button>
                          )}
                          <SearchSelect
                            className="input-base max-w-[110px] py-1 text-xs"
                            value={row.locale ?? 'nl-NL'}
                            onChange={(e) =>
                              void updateUser.mutate({ id: row.id, data: { locale: e.target.value } }).then(() => users.refetch())
                            }
                          >
                            <option value="nl-NL"><TranslatedText textKey="siteCopy.67603e3c12332d4a" fallbackText={"NL"} inline={false} /></option>
                            <option value="en-GB"><TranslatedText textKey="siteCopy.799b0cc02df909e0" fallbackText={"EN"} inline={false} /></option>
                            <option value="de-DE"><TranslatedText textKey="siteCopy.aa92ef2843cfc707" fallbackText={"DE"} inline={false} /></option>
                            <option value="fr-FR"><TranslatedText textKey="siteCopy.aa66c804894288a7" fallbackText={"FR"} inline={false} /></option>
                          </SearchSelect>
                          <Button size="sm" variant="ghost"
                            onClick={() => row.active ? setDeactivateTarget({ id: row.id, name: row.name }) : void toggleActive(row.id, row.active)}>
                            {row.active ? <TranslatedText textKey={'adminNew.users.deactivate'} /> : <TranslatedText textKey={'adminNew.users.activate'} />}
                          </Button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.users.total', { count: users.data?.meta?.total ?? rows.length })}
                meta={users.data?.meta}
                onPageChange={setPage}
              />
            </>
          )}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.users.modal.title')} subtitle={t('adminNew.users.modal.subtitle')} />
          <AdminModalBody>
            <div className="space-y-4">
              <Input label={t('adminNew.common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label={t('adminNew.common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label={t('adminNew.common.phone', { defaultValue: 'Telefoon' })} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label={t('adminNew.users.fields.password')} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.columns.role'} />}</span>
                <SearchSelect className="input-base" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="staff"><TranslatedText textKey="siteCopy.6530f4516d5d44de" fallbackText={"staff"} inline={false} /></option>
                  <option value="manager"><TranslatedText textKey="siteCopy.8821dd3d77119200" fallbackText={"manager"} inline={false} /></option>
                  <option value="admin"><TranslatedText textKey="siteCopy.b62572210341d121" fallbackText={"admin"} inline={false} /></option>
                  <option value="employee"><TranslatedText textKey="siteCopy.3dbe62f00d398de9" fallbackText={"employee"} inline={false} /></option>
                  <option value="finance"><TranslatedText textKey="siteCopy.07933ae8211d357c" fallbackText={"finance"} inline={false} /></option>
                </SearchSelect>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.fields.gender'} />}</span>
                  <SearchSelect className="input-base w-full" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">{t('adminNew.users.gender.unspecified')}</option>
                    <option value="male">{t('adminNew.users.gender.male')}</option>
                    <option value="female">{t('adminNew.users.gender.female')}</option>
                    <option value="other">{t('adminNew.users.gender.other')}</option>
                  </SearchSelect>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.fields.language'} />}</span>
                  <SearchSelect className="input-base w-full" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
                    <option value="">{t('adminNew.users.localeDefault')}</option>
                    <option value="nl"><TranslatedText textKey="siteCopy.67603e3c12332d4a" fallbackText={"NL"} inline={false} /></option>
                    <option value="en"><TranslatedText textKey="siteCopy.799b0cc02df909e0" fallbackText={"EN"} inline={false} /></option>
                    <option value="de"><TranslatedText textKey="siteCopy.aa92ef2843cfc707" fallbackText={"DE"} inline={false} /></option>
                  </SearchSelect>
                </label>
              </div>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{<TranslatedText textKey={'adminNew.common.cancel'} />}</Button>
            <Button type="submit" variant="gold" disabled={register.loading}>
              {register.loading ? <TranslatedText textKey={'adminNew.common.saving'} /> : <TranslatedText textKey={'adminNew.common.save'} />}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}>
        <form onSubmit={onEdit}>
          <AdminModalHeader title={t('adminNew.users.editModal.title', { defaultValue: 'Gebruiker bewerken' })} />
          <AdminModalBody>
            <div className="space-y-4">
              <Input label={t('adminNew.common.name')} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <Input label={t('adminNew.common.email')} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label={t('adminNew.common.phone', { defaultValue: 'Telefoon' })} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.columns.role'} />}</span>
                <SearchSelect className="input-base w-full" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="staff"><TranslatedText textKey="siteCopy.6530f4516d5d44de" fallbackText={"staff"} inline={false} /></option>
                  <option value="manager"><TranslatedText textKey="siteCopy.8821dd3d77119200" fallbackText={"manager"} inline={false} /></option>
                  <option value="admin"><TranslatedText textKey="siteCopy.b62572210341d121" fallbackText={"admin"} inline={false} /></option>
                  <option value="employee"><TranslatedText textKey="siteCopy.3dbe62f00d398de9" fallbackText={"employee"} inline={false} /></option>
                  <option value="finance"><TranslatedText textKey="siteCopy.07933ae8211d357c" fallbackText={"finance"} inline={false} /></option>
                </SearchSelect>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.fields.gender'} />}</span>
                  <SearchSelect className="input-base w-full" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">{t('adminNew.users.gender.unspecified')}</option>
                    <option value="male">{t('adminNew.users.gender.male')}</option>
                    <option value="female">{t('adminNew.users.gender.female')}</option>
                    <option value="other">{t('adminNew.users.gender.other')}</option>
                  </SearchSelect>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy-700">{<TranslatedText textKey={'adminNew.users.fields.language'} />}</span>
                  <SearchSelect className="input-base w-full" value={editForm.locale} onChange={(e) => setEditForm({ ...editForm, locale: e.target.value })}>
                    <option value="nl-NL"><TranslatedText textKey="siteCopy.718b2849bf60ef58" fallbackText={"Nederlands (NL)"} inline={false} /></option>
                    <option value="en-GB"><TranslatedText textKey="siteCopy.954ba9bee72cbee6" fallbackText={"English (EN)"} inline={false} /></option>
                    <option value="de-DE"><TranslatedText textKey="siteCopy.a4d3277d0d70e4bb" fallbackText={"Deutsch (DE)"} inline={false} /></option>
                    <option value="fr-FR"><TranslatedText textKey="siteCopy.5a36182e006d4973" fallbackText={"Français (FR)"} inline={false} /></option>
                  </SearchSelect>
                </label>
              </div>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>{<TranslatedText textKey={'adminNew.common.cancel'} />}</Button>
            <Button type="submit" variant="gold" disabled={updateUser.loading}>
              {updateUser.loading ? <TranslatedText textKey={'adminNew.common.saving'} /> : <TranslatedText textKey={'adminNew.common.save'} />}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          await toggleActive(deactivateTarget.id, true);
          setDeactivateTarget(null);
        }}
        title={t('adminNew.users.deactivate')}
        message={t('adminNew.users.confirmDeactivate', { name: deactivateTarget?.name ?? '' })}
        confirmLabel={t('adminNew.users.deactivate')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={UserX}
        loading={deactivate.loading}
      />

      {/* Block/unblock modal */}
      <AdminConfirmModal
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        onConfirm={onBlock}
        title={blockTarget?.isBlocked
          ? t('adminNew.users.unblock', { defaultValue: 'Deblokkeren' })
          : t('adminNew.users.block', { defaultValue: 'Blokkeren' })}
        message={blockTarget?.isBlocked
          ? t('adminNew.users.confirmUnblock', { name: blockTarget.name, defaultValue: `${blockTarget.name} deblokkeren?` })
          : t('adminNew.users.confirmBlock', { name: blockTarget?.name ?? '', defaultValue: `${blockTarget?.name} blokkeren?` })}
        confirmLabel={blockTarget?.isBlocked
          ? t('adminNew.users.unblock', { defaultValue: 'Deblokkeren' })
          : t('adminNew.users.block', { defaultValue: 'Blokkeren' })}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={blockTarget?.isBlocked ? ShieldCheck : Ban}
        loading={blockUser.loading || unblockUser.loading}
        inputLabel={!blockTarget?.isBlocked
          ? t('adminNew.users.blockReason', { defaultValue: 'Reden (optioneel)' })
          : undefined}
        inputPlaceholder={!blockTarget?.isBlocked
          ? t('adminNew.users.blockReasonPlaceholder', { defaultValue: 'bijv. misbruik, inactiviteit…' })
          : undefined}
        inputValue={!blockTarget?.isBlocked ? blockReason : undefined}
        onInputChange={!blockTarget?.isBlocked ? setBlockReason : undefined}
      />

      <AdminConfirmModal
        open={!!impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
        onConfirm={async () => {
          if (!impersonateTarget) return;
          await onImpersonate(impersonateTarget.id);
          setImpersonateTarget(null);
        }}
        title={t('adminNew.impersonation.confirmTitle')}
        message={t('adminNew.impersonation.confirmMessage', { name: impersonateTarget?.name ?? '' })}
        confirmLabel={t('adminNew.impersonation.action')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={UserRound}
      />
    </>
  );
}
