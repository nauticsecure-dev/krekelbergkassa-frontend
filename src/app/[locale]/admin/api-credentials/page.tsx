'use client';

import * as React from 'react';
import { Check, Copy, Eye, KeyRound, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { governanceService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';
import { trackEvent } from '@/lib/track-event';

type Credential = Record<string, unknown>;

const ENVIRONMENTS = ['production', 'staging', 'development'];

export default function ApiCredentialsPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const { push } = useToast();

  const [serviceFilter, setServiceFilter] = React.useState('');
  const [environmentFilter, setEnvironmentFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    service: '',
    environment: 'production',
    key_value: '',
    description: '',
  });

  const [revealed, setRevealed] = React.useState<{ key: string; revealedAt?: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Credential | null>(null);

  const credentials = useQuery([serviceFilter, environmentFilter, page], () =>
    governanceService.apiCredentials({
      service: serviceFilter || undefined,
      environment: environmentFilter || undefined,
      page,
      per_page: 25,
    })
  );

  const createCredential = useMutation(() => governanceService.createApiCredential(form));
  const revealCredential = useMutation((id: string) => governanceService.revealApiCredential(id));
  const deleteCredential = useMutation((id: string) => governanceService.deleteApiCredential(id));

  const rows = credentials.data?.data ?? [];
  const services = Array.from(
    new Set(rows.map((c) => String((c as Credential).service ?? '')).filter(Boolean))
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCredential.mutate();
      push({ tone: 'success', title: t('adminNew.credentials.toasts.created') });
      setShowCreate(false);
      setForm({ name: '', service: '', environment: 'production', key_value: '', description: '' });
      setPage(1);
      await credentials.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onReveal = async (cred: Credential) => {
    const id = String(cred.id);
    trackEvent('button_clicked', { metadata: { action: 'reveal_credential', credential_id: id } });
    try {
      const res = await revealCredential.mutate(id);
      const payload = (res?.data ?? res) as Record<string, unknown>;
      setCopied(false);
      setRevealed({
        key: String(payload.key_value ?? ''),
        revealedAt: payload.revealed_at ? String(payload.revealed_at) : undefined,
      });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCopy = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCredential.mutate(String(deleteTarget.id));
      push({ tone: 'success', title: t('adminNew.credentials.toasts.deleted') });
      setDeleteTarget(null);
      await credentials.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.credentials.title')}
        subtitle={t('adminNew.credentials.subtitle')}
        rightSlot={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreate(true)}
          >
            {t('adminNew.credentials.actions.new')}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.credentials.title')}
          description={t('adminNew.credentials.subtitle')}
          icon={KeyRound}
        >
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <AdminSelect
              value={serviceFilter}
              onChange={(v) => {
                setServiceFilter(v);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.credentials.allServices')}</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={environmentFilter}
              onChange={(v) => {
                setEnvironmentFilter(v);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.credentials.allEnvironments')}</option>
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {t(`adminNew.credentials.environments.${env}`)}
                </option>
              ))}
            </AdminSelect>
          </AdminToolbar>

          <AdminTableCard
            footer={
              rows.length > 0 ? (
                <AdminTableFooter
                  summary={t('adminNew.credentials.count', {
                    count: credentials.data?.meta?.total ?? rows.length,
                  })}
                  meta={credentials.data?.meta}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {credentials.loading ? (
              <LoadingState label={t('adminNew.credentials.loading')} variant="table" />
            ) : null}
            {!credentials.loading && credentials.error ? (
              <ErrorState message={credentials.error} onRetry={() => void credentials.refetch()} />
            ) : null}
            {!credentials.loading && !credentials.error && rows.length === 0 ? (
              <EmptyState title={t('adminNew.credentials.empty')} />
            ) : null}

            {!credentials.loading && !credentials.error && rows.length > 0 ? (
              <AdminTable minWidth={1040}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.service')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.environment')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.expires')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.lastUsed')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.credentials.columns.createdBy')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">
                      {t('adminNew.credentials.columns.actions')}
                    </AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((raw) => {
                    const cred = raw as Credential;
                    const isActive = Boolean(cred.is_active);
                    const isExpired = Boolean(cred.is_expired);
                    const createdBy = (cred.created_by ?? {}) as Record<string, unknown>;
                    return (
                      <AdminTableRow key={String(cred.id)}>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {String(cred.name ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell>{String(cred.service ?? '—')}</AdminTableCell>
                        <AdminTableCell>
                          <Badge tone="navy">{String(cred.environment ?? '—')}</Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          {isExpired ? (
                            <Badge tone="danger">{t('adminNew.credentials.status.expired')}</Badge>
                          ) : isActive ? (
                            <Badge tone="success">{t('adminNew.credentials.status.active')}</Badge>
                          ) : (
                            <Badge tone="neutral">{t('adminNew.credentials.status.inactive')}</Badge>
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-xs">
                          {cred.expires_at ? formatDateTime(String(cred.expires_at), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-xs">
                          {cred.last_used_at ? formatDateTime(String(cred.last_used_at), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell className="text-xs text-navy-500">
                          {String(createdBy.name ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Eye className="h-3.5 w-3.5" />}
                              disabled={revealCredential.loading}
                              onClick={() => void onReveal(cred)}
                            >
                              {t('adminNew.credentials.actions.reveal')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeleteTarget(cred)}
                            >
                              {t('adminNew.common.delete')}
                            </Button>
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

      {/* New credential modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.credentials.modal.title')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.credentials.fields.name')}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('adminNew.credentials.fields.service')}
              value={form.service}
              onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.credentials.fields.environment')}
              </label>
              <select
                className="input-base w-full"
                value={form.environment}
                onChange={(e) => setForm((p) => ({ ...p, environment: e.target.value }))}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {t(`adminNew.credentials.environments.${env}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('adminNew.credentials.fields.keyValue')}
              value={form.key_value}
              onChange={(e) => setForm((p) => ({ ...p, key_value: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.credentials.fields.description')}
              </label>
              <textarea
                className="input-base min-h-20 w-full"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createCredential.loading}>
              {createCredential.loading ? t('adminNew.common.saving') : t('adminNew.credentials.actions.new')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reveal modal */}
      <Modal open={!!revealed} onClose={() => setRevealed(null)} size="md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.credentials.reveal.title')}
          </h2>
          <p className="mt-1 text-sm text-amber-700">{t('adminNew.credentials.reveal.auditNote')}</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-navy-100 bg-sand-50/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-navy-900">
              {revealed?.key}
            </code>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              onClick={() => void onCopy()}
            >
              {copied ? t('adminNew.credentials.reveal.copied') : t('adminNew.credentials.reveal.copy')}
            </Button>
          </div>
          {revealed?.revealedAt ? (
            <p className="mt-2 text-xs text-navy-500">
              {t('adminNew.credentials.reveal.revealedAt', {
                time: formatDateTime(revealed.revealedAt, dateLocale),
              })}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end">
            <Button variant="ghost" onClick={() => setRevealed(null)}>
              {t('adminNew.common.close')}
            </Button>
          </div>
        </div>
      </Modal>

      <AdminConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title={t('adminNew.credentials.delete.title')}
        message={t('adminNew.credentials.delete.message', {
          name: String(deleteTarget?.name ?? ''),
        })}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Trash2}
        loading={deleteCredential.loading}
      />
    </>
  );
}
