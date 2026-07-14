'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminSelect,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formsService, type FormQuestion, type FormTemplate } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const QUESTION_TYPES = [
  { value: 'text', label: 'Tekst (kort)' },
  { value: 'textarea', label: 'Tekst (lang)' },
  { value: 'number', label: 'Getal' },
  { value: 'currency', label: 'Valuta (€)' },
  { value: 'date', label: 'Datum' },
  { value: 'time', label: 'Tijd' },
  { value: 'yes_no', label: 'Ja / Nee' },
  { value: 'radio', label: 'Radio (één keuze)' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Meerkeuze' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'photo_upload', label: 'Foto upload' },
  { value: 'file_upload', label: 'Bestand upload' },
  { value: 'signature', label: 'Handtekening' },
];

const TYPE_NEEDS_OPTIONS = new Set(['radio', 'select', 'multi_select']);

const EMPTY_QUESTION = {
  label_nl: '',
  label_en: '',
  label_de: '',
  type: 'text' as string,
  required: false,
  unit: '',
  options: '' as string, // newline-separated "value|label_nl" pairs
  help_nl: '',
};

export default function FormBuilderPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);

  const [editMeta, setEditMeta] = React.useState(false);
  const [metaForm, setMetaForm] = React.useState({ name_nl: '', name_en: '', name_de: '', status: 'draft', offline_enabled: false, category: 'stalling' });
  const [showAddQuestion, setShowAddQuestion] = React.useState(false);
  const [editQuestion, setEditQuestion] = React.useState<FormQuestion | null>(null);
  const [questionForm, setQuestionForm] = React.useState(EMPTY_QUESTION);
  const [deleteQuestionId, setDeleteQuestionId] = React.useState<string | null>(null);

  const template = useQuery([id], () => formsService.get(id));
  const tmpl = template.data as FormTemplate | null | undefined;

  React.useEffect(() => {
    if (tmpl && !editMeta) {
      setMetaForm({
        name_nl: tmpl.name_json?.nl ?? '',
        name_en: tmpl.name_json?.en ?? '',
        name_de: tmpl.name_json?.de ?? '',
        status: tmpl.status ?? 'draft',
        offline_enabled: tmpl.offline_enabled ?? false,
        category: tmpl.category ?? 'stalling',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmpl?.id]);

  const updateTemplate = useMutation((payload: Partial<FormTemplate>) => formsService.update(id, payload));
  const addQuestion = useMutation((payload: Partial<FormQuestion>) => formsService.addQuestion(id, payload));
  const updateQuestion = useMutation(({ qid, payload }: { qid: string; payload: Partial<FormQuestion> }) =>
    formsService.updateQuestion(id, qid, payload)
  );
  const deleteQuestion = useMutation((qid: string) => formsService.deleteQuestion(id, qid));

  const questions = (tmpl?.questions ?? []) as FormQuestion[];

  const onSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTemplate.mutate({
        name_json: {
          nl: metaForm.name_nl.trim(),
          ...(metaForm.name_en.trim() ? { en: metaForm.name_en.trim() } : {}),
          ...(metaForm.name_de.trim() ? { de: metaForm.name_de.trim() } : {}),
        },
        status: metaForm.status as FormTemplate['status'],
        offline_enabled: metaForm.offline_enabled,
        category: metaForm.category,
      });
      setEditMeta(false);
      await template.refetch();
      push({ tone: 'success', title: 'Opgeslagen' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const buildQuestionPayload = (f: typeof questionForm): Partial<FormQuestion> => {
    const payload: Partial<FormQuestion> = {
      type: f.type,
      label_json: {
        nl: f.label_nl.trim(),
        ...(f.label_en.trim() ? { en: f.label_en.trim() } : {}),
        ...(f.label_de.trim() ? { de: f.label_de.trim() } : {}),
      },
      required: f.required,
      unit: f.unit.trim() || undefined,
      help_text_json: f.help_nl.trim() ? { nl: f.help_nl.trim() } : undefined,
    };

    if (TYPE_NEEDS_OPTIONS.has(f.type) && f.options.trim()) {
      payload.options_json = f.options
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [val, ...rest] = line.split('|');
          return { value: val.trim(), label_json: { nl: rest.join('|').trim() || val.trim() } };
        });
    }

    return payload;
  };

  const onAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.label_nl.trim()) return;
    try {
      await addQuestion.mutate(buildQuestionPayload(questionForm));
      setShowAddQuestion(false);
      setQuestionForm(EMPTY_QUESTION);
      await template.refetch();
      push({ tone: 'success', title: 'Vraag toegevoegd' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onEditQuestion = (q: FormQuestion) => {
    setEditQuestion(q);
    setQuestionForm({
      label_nl: q.label_json?.nl ?? '',
      label_en: q.label_json?.en ?? '',
      label_de: q.label_json?.de ?? '',
      type: q.type,
      required: q.required,
      unit: q.unit ?? '',
      options: (q.options_json ?? []).map((o) => `${o.value}|${o.label_json?.nl ?? o.value}`).join('\n'),
      help_nl: q.help_text_json?.nl ?? '',
    });
  };

  const onSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion || !questionForm.label_nl.trim()) return;
    try {
      await updateQuestion.mutate({ qid: editQuestion.id, payload: buildQuestionPayload(questionForm) });
      setEditQuestion(null);
      setQuestionForm(EMPTY_QUESTION);
      await template.refetch();
      push({ tone: 'success', title: 'Vraag bijgewerkt' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onDeleteQuestion = async () => {
    if (!deleteQuestionId) return;
    try {
      await deleteQuestion.mutate(deleteQuestionId);
      setDeleteQuestionId(null);
      await template.refetch();
      push({ tone: 'success', title: 'Vraag verwijderd' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onMoveQuestion = async (q: FormQuestion, direction: 'up' | 'down') => {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;

    const newOrder = [...questions];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    try {
      await formsService.reorderQuestions(id, newOrder.map((x) => x.id));
      await template.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const statusTone = (s: string) => s === 'active' ? 'success' as const : s === 'archived' ? 'navy' as const : 'neutral' as const;
  const statusLabel = (s: string) => s === 'active' ? 'Actief' : s === 'archived' ? 'Gearchiveerd' : 'Concept';

  const QuestionForm = ({ onSubmit, loading }: { onSubmit: (e: React.FormEvent) => Promise<void>; loading: boolean }) => (
    <form onSubmit={onSubmit}>
      <AdminModalBody>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Vraag (NL) *</label>
            <Input value={questionForm.label_nl} onChange={(e) => setQuestionForm((f) => ({ ...f, label_nl: e.target.value }))} placeholder="Beschrijf het probleem..." required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Vraag (EN)</label>
            <Input value={questionForm.label_en} onChange={(e) => setQuestionForm((f) => ({ ...f, label_en: e.target.value }))} placeholder="Describe the problem..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Vraag (DE)</label>
            <Input value={questionForm.label_de} onChange={(e) => setQuestionForm((f) => ({ ...f, label_de: e.target.value }))} placeholder="Beschreiben Sie das Problem..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Type</label>
            <AdminSelect value={questionForm.type} onChange={(v) => setQuestionForm((f) => ({ ...f, type: v }))}>
              {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
            </AdminSelect>
          </div>
          {TYPE_NEEDS_OPTIONS.has(questionForm.type) ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">
                Opties (één per regel, formaat: <code>waarde|label NL</code>)
              </label>
              <textarea
                className="input-base w-full font-mono text-xs"
                rows={4}
                value={questionForm.options}
                onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))}
                placeholder={"good|Goed\ndamage|Schade\nunknown|Onbekend"}
              />
            </div>
          ) : null}
          {questionForm.type === 'number' || questionForm.type === 'currency' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Eenheid (bijv. %, kg, m)</label>
              <Input value={questionForm.unit} onChange={(e) => setQuestionForm((f) => ({ ...f, unit: e.target.value }))} placeholder="%" />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Helptext (NL)</label>
            <Input value={questionForm.help_nl} onChange={(e) => setQuestionForm((f) => ({ ...f, help_nl: e.target.value }))} placeholder="Extra uitleg bij de vraag..." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={questionForm.required} onChange={(e) => setQuestionForm((f) => ({ ...f, required: e.target.checked }))} />
            Verplicht
          </label>
        </div>
      </AdminModalBody>
      <AdminModalFooter>
        <Button variant="outline" size="sm" type="button" onClick={() => { setShowAddQuestion(false); setEditQuestion(null); setQuestionForm(EMPTY_QUESTION); }}>Annuleren</Button>
        <Button variant="gold" size="sm" type="submit" disabled={loading || !questionForm.label_nl.trim()}>
          {loading ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </AdminModalFooter>
    </form>
  );

  return (
    <>
      <AdminPageHeader
        title={tmpl?.name_json?.nl ?? 'Formulier builder'}
        subtitle={`${questions.length} vragen · ${tmpl?.category ?? ''}`}
        rightSlot={
          <div className="flex items-center gap-2">
            {tmpl ? <Badge tone={statusTone(tmpl.status)}>{statusLabel(tmpl.status)}</Badge> : null}
            <Link href={`/${locale}/admin/forms`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
          </div>
        }
        stats={[
          { label: 'Vragen', value: questions.length, icon: CheckSquare, tone: 'marine', loading: template.loading },
          { label: 'Verstuurd', value: tmpl?.responses_count ?? 0, icon: FileText, tone: 'gold', loading: template.loading },
        ]}
      />

      <AdminContent>
        {template.loading ? <LoadingState label={t('adminNew.common.loading')} variant="detail" /> : null}
        {template.error ? <ErrorState message={template.error} onRetry={() => void template.refetch()} /> : null}

        {!template.loading && !template.error && tmpl ? (
          <>
            {/* Meta card */}
            <AdminSectionCard
              title="Formulier instellingen"
              icon={FileText}
              action={
                editMeta ? null : (
                  <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditMeta(true)}>
                    Bewerken
                  </Button>
                )
              }
            >
              {editMeta ? (
                <form onSubmit={onSaveMeta} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam NL *</label>
                      <Input value={metaForm.name_nl} onChange={(e) => setMetaForm((f) => ({ ...f, name_nl: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam EN</label>
                      <Input value={metaForm.name_en} onChange={(e) => setMetaForm((f) => ({ ...f, name_en: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Naam DE</label>
                      <Input value={metaForm.name_de} onChange={(e) => setMetaForm((f) => ({ ...f, name_de: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Status</label>
                      <AdminSelect value={metaForm.status} onChange={(v) => setMetaForm((f) => ({ ...f, status: v }))}>
                        <option value="draft">Concept</option>
                        <option value="active">Actief</option>
                        <option value="archived">Gearchiveerd</option>
                      </AdminSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Categorie</label>
                      <AdminSelect value={metaForm.category} onChange={(v) => setMetaForm((f) => ({ ...f, category: v }))}>
                        <option value="stalling">Stalling</option>
                        <option value="inspection">Inspectie</option>
                        <option value="handover">Overdracht</option>
                        <option value="crane">Kraanwerk</option>
                        <option value="repair">Reparatie</option>
                        <option value="general">Algemeen</option>
                      </AdminSelect>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={metaForm.offline_enabled} onChange={(e) => setMetaForm((f) => ({ ...f, offline_enabled: e.target.checked }))} />
                    Offline beschikbaar (PWA / geen internet nodig)
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" variant="gold" size="sm" disabled={updateTemplate.loading} leftIcon={<Save className="h-3.5 w-3.5" />}>
                      {updateTemplate.loading ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditMeta(false)}>Annuleren</Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">NL</div>
                    <div className="font-medium">{tmpl.name_json?.nl || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">EN</div>
                    <div className="font-medium text-navy-600">{tmpl.name_json?.en || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">DE</div>
                    <div className="font-medium text-navy-600">{tmpl.name_json?.de || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">Offline</div>
                    <div className="font-medium">{tmpl.offline_enabled ? 'Ja' : 'Nee'}</div>
                  </div>
                </div>
              )}
            </AdminSectionCard>

            {/* Questions builder */}
            <AdminSectionCard
              title={`Vragen (${questions.length})`}
              icon={CheckSquare}
              className="mt-5"
              action={
                <Button size="sm" variant="gold" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowAddQuestion(true)}>
                  Vraag toevoegen
                </Button>
              }
            >
              {questions.length === 0 ? (
                <EmptyState
                  title="Geen vragen"
                  message="Voeg vragen toe om dit formulier compleet te maken."
                  action={<Button variant="gold" size="sm" onClick={() => setShowAddQuestion(true)}>Eerste vraag toevoegen</Button>}
                />
              ) : (
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="group flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-3 shadow-sm transition hover:border-marine-200"
                    >
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-navy-400">#{idx + 1}</span>
                          <span className="font-semibold text-navy-900">{q.label_json?.nl ?? '—'}</span>
                          {q.label_json?.en ? <span className="text-xs text-navy-400">/ {q.label_json.en}</span> : null}
                          {q.required ? <Badge tone="warning">Verplicht</Badge> : null}
                          <Badge tone="navy">{QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}</Badge>
                          {q.unit ? <span className="text-xs text-navy-500">[{q.unit}]</span> : null}
                        </div>
                        {q.help_text_json?.nl ? (
                          <div className="mt-1 text-xs text-navy-500">{q.help_text_json.nl}</div>
                        ) : null}
                        {q.options_json && q.options_json.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.options_json.slice(0, 5).map((o) => (
                              <span key={o.value} className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] text-navy-700">{o.label_json?.nl ?? o.value}</span>
                            ))}
                            {q.options_json.length > 5 ? <span className="text-xs text-navy-400">+{q.options_json.length - 5}</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => onMoveQuestion(q, 'up')} disabled={idx === 0} className="rounded p-1 text-navy-400 hover:bg-navy-100 disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onMoveQuestion(q, 'down')} disabled={idx === questions.length - 1} className="rounded p-1 text-navy-400 hover:bg-navy-100 disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onEditQuestion(q)} className="rounded p-1 text-navy-400 hover:bg-navy-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteQuestionId(q.id)} className="rounded p-1 text-rose-400 hover:bg-rose-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>

      {/* Add question modal */}
      <Modal open={showAddQuestion} onClose={() => { setShowAddQuestion(false); setQuestionForm(EMPTY_QUESTION); }}>
        <AdminModalHeader title="Vraag toevoegen" />
        <QuestionForm onSubmit={onAddQuestion} loading={addQuestion.loading} />
      </Modal>

      {/* Edit question modal */}
      <Modal open={!!editQuestion} onClose={() => { setEditQuestion(null); setQuestionForm(EMPTY_QUESTION); }}>
        <AdminModalHeader title="Vraag bewerken" />
        <QuestionForm onSubmit={onSaveQuestion} loading={updateQuestion.loading} />
      </Modal>

      <AdminConfirmModal
        open={!!deleteQuestionId}
        title="Vraag verwijderen"
        message="Weet je zeker dat je deze vraag wilt verwijderen?"
        confirmLabel="Verwijderen"
        onConfirm={onDeleteQuestion}
        onClose={() => setDeleteQuestionId(null)}
        loading={deleteQuestion.loading}
        variant="danger"
      />
    </>
  );
}
