'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckSquare, Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
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
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formsService, type FormTemplate } from '@/lib/services';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const CATEGORIES = [
  { value: 'stalling', label: 'Stalling' },
  { value: 'inspection', label: 'Inspectie' },
  { value: 'handover', label: 'Overdracht' },
  { value: 'crane', label: 'Kraanwerk' },
  { value: 'repair', label: 'Reparatie' },
  { value: 'general', label: 'Algemeen' },
];

const STATUSES = [
  { value: 'draft', label: 'Concept', tone: 'neutral' as const },
  { value: 'active', label: 'Actief', tone: 'success' as const },
  { value: 'archived', label: 'Gearchiveerd', tone: 'navy' as const },
];

function statusTone(s: string) {
  return STATUSES.find((x) => x.value === s)?.tone ?? 'neutral';
}

export default function FormsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name_nl: '',
    name_en: '',
    name_de: '',
    category: 'stalling',
    offline_enabled: false,
  });

  const templates = useQuery([search, categoryFilter, page], () =>
    formsService.list({
      search: search || undefined,
      category: categoryFilter || undefined,
      page,
      per_page: 25,
    })
  );

  const createTemplate = useMutation(formsService.create);
  const deleteTemplate = useMutation((id: string) => formsService.destroy(id));

  const rows = templates.data?.data ?? [];

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_nl.trim()) return;
    try {
      const created = await createTemplate.mutate({
        name_json: {
          nl: form.name_nl.trim(),
          ...(form.name_en.trim() ? { en: form.name_en.trim() } : {}),
          ...(form.name_de.trim() ? { de: form.name_de.trim() } : {}),
        },
        category: form.category,
        offline_enabled: form.offline_enabled,
        status: 'draft',
      });
      setShowCreate(false);
      setForm({ name_nl: '', name_en: '', name_de: '', category: 'stalling', offline_enabled: false });
      await templates.refetch();
      push({ tone: 'success', title: 'Formulier aangemaakt' });
      if (created?.id) window.location.href = `/${locale}/admin/forms/${created.id}`;
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate.mutate(deleteTarget);
      setDeleteTarget(null);
      await templates.refetch();
      push({ tone: 'success', title: 'Formulier verwijderd' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Formulieren & Checklists"
        subtitle="Beheer dynamische formulieren, checklists en inspecties"
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Nieuw formulier
          </Button>
        }
        stats={[
          { label: 'Formulieren', value: templates.data?.meta?.total ?? rows.length, icon: FileText, tone: 'marine', loading: templates.loading },
          { label: 'Actief', value: rows.filter((r) => r.status === 'active').length, icon: CheckSquare, tone: 'success', loading: templates.loading },
          { label: 'Concept', value: rows.filter((r) => r.status === 'draft').length, icon: FileText, tone: 'warning', loading: templates.loading },
        ]}
      />

      <AdminContent>
        <AdminSectionCard title="Formulier templates" icon={FileText}>
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <AdminSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Zoek formulier..." />
            <AdminSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <option value="">Alle categorieën</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </AdminSelect>
          </AdminToolbar>

          {templates.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!templates.loading && templates.error ? <ErrorState message={templates.error} onRetry={() => void templates.refetch()} /> : null}

          {!templates.loading && !templates.error ? (
            rows.length === 0 ? (
              <EmptyState
                title="Geen formulieren gevonden"
                message="Maak een nieuw formulier aan om te beginnen."
                action={<Button variant="gold" size="sm" onClick={() => setShowCreate(true)}>Nieuw formulier</Button>}
              />
            ) : (
              <AdminTableCard footer={
                <AdminTableFooter
                  summary={`${templates.data?.meta?.total ?? rows.length} formulieren`}
                  meta={templates.data?.meta}
                  onPageChange={setPage}
                />
              }>
                <AdminTable minWidth={700}>
                  <AdminTableHead>
                    <tr>
                      <AdminTableHeaderCell>Naam</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Categorie</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Vragen</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Verstuurd</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Bijgewerkt</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {rows.map((tmpl: FormTemplate) => (
                      <AdminTableRow key={tmpl.id}>
                        <AdminTableCell>
                          <Link
                            href={`/${locale}/admin/forms/${tmpl.id}`}
                            className="font-semibold text-marine-700 hover:text-marine-900"
                          >
                            {tmpl.name_json?.nl ?? tmpl.name_json?.en ?? '—'}
                          </Link>
                          {tmpl.offline_enabled ? (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-gold-600">Offline</span>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="text-xs text-navy-600">{CATEGORIES.find((c) => c.value === tmpl.category)?.label ?? tmpl.category}</span>
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={statusTone(tmpl.status)}>
                            {STATUSES.find((s) => s.value === tmpl.status)?.label ?? tmpl.status}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell className="tabular-nums text-sm text-navy-700">
                          {tmpl.questions_count ?? '—'}
                        </AdminTableCell>
                        <AdminTableCell className="tabular-nums text-sm text-navy-700">
                          {tmpl.responses_count ?? '—'}
                        </AdminTableCell>
                        <AdminTableCell className="text-xs text-navy-400">
                          {tmpl.updated_at ? formatDate(tmpl.updated_at, dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/${locale}/admin/forms/${tmpl.id}`}>
                              <Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />}>
                                Open
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeleteTarget(tmpl.id)}
                            >
                              {t('adminNew.common.delete')}
                            </Button>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </AdminTable>
              </AdminTableCard>
            )
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={onCreate}>
          <AdminModalHeader title="Nieuw formulier" />
          <AdminModalBody>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam (NL) *</label>
                <Input value={form.name_nl} onChange={(e) => setForm((f) => ({ ...f, name_nl: e.target.value }))} placeholder="Winterstalling checklist" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam (EN)</label>
                <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Winter storage checklist" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam (DE)</label>
                <Input value={form.name_de} onChange={(e) => setForm((f) => ({ ...f, name_de: e.target.value }))} placeholder="Winterlager Checkliste" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Categorie</label>
                <AdminSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </AdminSelect>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.offline_enabled} onChange={(e) => setForm((f) => ({ ...f, offline_enabled: e.target.checked }))} />
                Offline beschikbaar (PWA)
              </label>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setShowCreate(false)}>Annuleren</Button>
            <Button variant="gold" size="sm" type="submit" disabled={createTemplate.loading || !form.name_nl.trim()}>
              {createTemplate.loading ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!deleteTarget}
        title="Formulier verwijderen"
        message="Weet je zeker dat je dit formulier wilt verwijderen? Alle vragen en logica worden ook verwijderd."
        confirmLabel="Verwijderen"
        onConfirm={onDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleteTemplate.loading}
        variant="danger"
      />
    </>
  );
}
