'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Anchor, ArrowLeft, FileText, Ship, Warehouse } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminStatusStrip,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { auditService, boatsService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function BoatDossierPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  const [showEdit, setShowEdit] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    length_cm: '',
    width_cm: '',
    location_code: '',
    type: 'motor',
  });

  const dossier = useQuery([id], () => boatsService.dossier(id));
  const audit = useQuery([id, 'audit'], () => auditService.byEntity('boat', id));
  const updateBoat = useMutation((payload: Record<string, unknown>) =>
    boatsService.update(id, payload)
  );

  React.useEffect(() => {
    const boat = dossier.data?.boat as Record<string, unknown> | undefined;
    if (!boat) return;
    setForm({
      name: String(boat.name ?? ''),
      length_cm: boat.length_cm != null ? String(boat.length_cm) : '',
      width_cm: boat.width_cm != null ? String(boat.width_cm) : '',
      location_code: String(boat.location_code ?? ''),
      type: String(boat.type ?? 'motor'),
    });
  }, [dossier.data]);

  const boat = (dossier.data?.boat ?? {}) as Record<string, unknown>;
  const owner = (dossier.data?.owner ?? {}) as Record<string, unknown>;
  const storage = (dossier.data?.storage_contracts ?? []) as Array<Record<string, unknown>>;
  const invoices = ((dossier.data?.financial as Record<string, unknown>)?.invoices ??
    []) as Array<Record<string, unknown>>;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBoat.mutate({
        name: form.name,
        type: form.type,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        location_code: form.location_code || null,
      });
      setShowEdit(false);
      await dossier.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.updated') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.boats.toasts.updateFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={String(boat.name ?? t('adminNew.boats.title'))}
        subtitle={t('adminNew.boats.dossierSubtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/boten`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            <Button variant="gold" size="sm" onClick={() => setShowEdit(true)}>
              {t('adminNew.common.edit')}
            </Button>
          </div>
        }
        stats={[
          {
            label: t('adminNew.boats.columns.length'),
            value: boat.length_cm ? `${boat.length_cm} cm` : '—',
            icon: Anchor,
            tone: 'marine',
            loading: dossier.loading,
          },
          {
            label: t('adminNew.boats.columns.location'),
            value: String(boat.location_code ?? '—'),
            icon: Ship,
            tone: 'gold',
          },
          {
            label: t('adminNew.stalling.title'),
            value: storage.length,
            icon: Warehouse,
            tone: 'navy',
          },
          {
            label: t('admin.sidebar.invoices'),
            value: invoices.length,
            icon: FileText,
            tone: 'success',
          },
        ]}
      />

      <AdminContent className="grid gap-5 lg:grid-cols-2">
        {dossier.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
        {dossier.error ? (
          <ErrorState message={dossier.error} onRetry={() => void dossier.refetch()} />
        ) : null}

        {!dossier.loading && !dossier.error ? (
          <>
            <AdminSectionCard title={t('adminNew.boats.columns.owner')} icon={Ship}>
              <div className="space-y-2 text-sm">
                <AdminStatusStrip label={t('adminNew.common.name')} value={String(owner.name ?? '—')} tone="marine" />
                {owner.id ? (
                  <Link
                    href={`/${locale}/admin/klanten/${owner.id}`}
                    className="text-sm font-semibold text-marine-700 hover:text-marine-900"
                  >
                    {t('adminNew.customers.details')} →
                  </Link>
                ) : null}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title={t('adminNew.stalling.title')} icon={Warehouse}>
              <div className="space-y-2">
                {storage.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.stalling.emptyMessage')}</p>
                ) : (
                  storage.map((c) => (
                    <div key={String(c.id)} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                      <div className="font-semibold text-navy-900">{String(c.contract_number ?? '—')}</div>
                      <div className="text-navy-500">{String(c.status ?? '')}</div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>

            <div className="lg:col-span-2">
            <AdminSectionCard title={t('admin.sidebar.invoices')} icon={FileText}>
              <div className="space-y-2">
                {invoices.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.invoices.emptyMessage')}</p>
                ) : (
                  invoices.map((inv) => (
                    <Link
                      key={String(inv.id)}
                      href={`/${locale}/admin/facturen/${inv.id}`}
                      className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-sand-50"
                    >
                      <span className="font-semibold text-navy-900">{String(inv.invoice_number ?? inv.id)}</span>
                      <span>{formatCurrency(Number(inv.total_amount ?? 0) / 100, dateLocale)}</span>
                    </Link>
                  ))
                )}
              </div>
            </AdminSectionCard>
            </div>

            <div className="lg:col-span-2">
            <AdminSectionCard title={t('admin.sidebar.audit')} icon={Anchor}>
              <div className="space-y-2">
                {(audit.data ?? []).slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                    <div className="font-medium text-navy-900">{log.action}</div>
                    <div className="text-xs text-navy-500">
                      {formatDate(log.created_at, dateLocale)} · {log.user?.name ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
            </div>
          </>
        ) : null}
      </AdminContent>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} size="md">
        <form onSubmit={onSave}>
          <AdminModalHeader title={t('adminNew.boats.editTitle')} subtitle={t('adminNew.boats.editSubtitle')} />
          <AdminModalBody>
            <Input label={t('adminNew.common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t('adminNew.boats.columns.length')} value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} type="number" />
            <Input label={t('adminNew.boats.columns.location')} value={form.location_code} onChange={(e) => setForm({ ...form, location_code: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={updateBoat.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
