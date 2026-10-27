'use client';

import * as React from 'react';
import { Award, Pencil } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useCms, useCmsEditorOpen, type ContentBlock, type LocaleTag } from './CmsProvider';

const PAGE = 'over-ons';
const FIELDS = [
  { key: 'over-ons.hiswa.title', label: 'cms.hiswaTitle', type: 'short_text' },
  { key: 'over-ons.hiswa.desc', label: 'cms.hiswaDescription', type: 'paragraph' },
] as const;
type Draft = Partial<Record<LocaleTag, Record<string, string>>>;
const fieldClass = 'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500';

export function EditableHiswaCard() {
  const { t } = useIntl();
  const { isCmsEditing, retainCmsDrafts, getText } = useCms();
  const [open, setOpen] = useCmsEditorOpen();
  const trigger = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <div data-cms-card="over-ons.hiswa" className={`mt-6 flex items-center gap-3 rounded-xl border border-navy-100 bg-sand-50/50 p-4 ${isCmsEditing ? 'outline-dashed outline-2 outline-gold-400/60' : ''}`}>
        <Award aria-hidden className="h-5 w-5 shrink-0 text-gold-600" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-navy-900">{getText(FIELDS[0].key, t('over.hiswaTitle'))}</div>
          <div className="text-xs text-navy-500">{getText(FIELDS[1].key, t('over.hiswaDesc'))}</div>
        </div>
        {isCmsEditing ? (
          <button ref={trigger} type="button" data-cms-edit aria-label={t('cms.editHiswa')} title={t('cms.editHiswa')}
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-white shadow transition hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2">
            <Pencil aria-hidden className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {open && (isCmsEditing || retainCmsDrafts) ? <HiswaEditor onClose={() => { setOpen(false); trigger.current?.focus(); }} /> : null}
    </>
  );
}

function HiswaEditor({ onClose }: { onClose: () => void }) {
  const { t } = useIntl();
  const { localeTag, editorLocales, getText, saveText } = useCms();
  const { push, pushError } = useToast();
  const [active, setActive] = React.useState(localeTag);
  React.useEffect(() => { if (editorLocales.length && !editorLocales.includes(active)) setActive(editorLocales[0]); }, [active, editorLocales]);
  const [values, setValues] = React.useState<Draft>({});
  const [base, setBase] = React.useState<Draft>({});
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fieldId = React.useId();
  const firstInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    const fallback = {
      [FIELDS[0].key]: getText(FIELDS[0].key, t('over.hiswaTitle')),
      [FIELDS[1].key]: getText(FIELDS[1].key, t('over.hiswaDesc')),
    };
    void Promise.all(editorLocales.map(async (tag) => {
      const response = await cmsService.pageContent(PAGE, tag) as { content_blocks?: ContentBlock[] };
      const fields = Object.fromEntries(FIELDS.map(({ key }) => [key,
        response.content_blocks?.find((block) => block.key === key)?.value ?? (tag === localeTag ? fallback[key] : ''),
      ]));
      return [tag, fields] as const;
    })).then((entries) => {
      if (cancelled) return;
      const loaded = Object.fromEntries(entries);
      setValues(loaded);
      setBase(loaded);
    }).catch((error) => {
      if (cancelled) return;
      setFailed(true);
      pushError(error, t('cms.loadError'));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Each opening mounts a new editor. CMS updates during saving must not reset drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { if (!loading && !failed) firstInput.current?.focus(); }, [loading, failed]);

  const save = async () => {
    if (loading || failed || saving) return;
    setSaving(true);
    try {
      for (const field of FIELDS) {
        const changed: Partial<Record<LocaleTag, string>> = {};
        for (const tag of editorLocales) {
          const value = values[tag]?.[field.key] ?? '';
          if (value !== (base[tag]?.[field.key] ?? '')) changed[tag] = value;
        }
        if (!Object.keys(changed).length) continue;
        await saveText(field.key, { page: PAGE, section: 'story', type: field.type, value_by_locale: changed });
        // Track each successful field so a retry after a partial failure is safe.
        setBase((previous) => {
          const next = { ...previous };
          for (const tag of editorLocales) {
            if (changed[tag] !== undefined) next[tag] = { ...next[tag], [field.key]: changed[tag]! };
          }
          return next;
        });
      }
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (error) {
      pushError(error, t('cms.saveError'));
    } finally { setSaving(false); }
  };

  const busy = loading || saving;
  return (
    <Modal open onClose={() => { if (!saving) onClose(); }} size="lg">
      <div className="border-b border-navy-100 px-6 py-5"><h2 className="text-lg font-semibold text-navy-900">{t('cms.editHiswa')}</h2></div>
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Locale">
          {editorLocales.map((tag) => <button key={tag} type="button" disabled={busy || failed} aria-pressed={active === tag} onClick={() => setActive(tag)}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${active === tag ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600'}`}>
            {tag.split('-')[0].toUpperCase()}
          </button>)}
        </div>
        {loading ? <p role="status">{t('cms.loadingLocales')}</p> : null}
        {failed ? <p role="alert">{t('cms.loadError')}</p> : null}
        {FIELDS.map((field, index) => <div key={field.key} className="space-y-1 text-sm font-medium text-navy-700">
          <label className="block" htmlFor={`${fieldId}-${index}`}>{t(field.label)}</label>
          {index === 0 ? <input id={`${fieldId}-${index}`} ref={firstInput} className={fieldClass} disabled={busy || failed} value={values[active]?.[field.key] ?? ''}
            onChange={(event) => setValues((previous) => ({ ...previous, [active]: { ...previous[active], [field.key]: event.target.value } }))} />
            : <textarea id={`${fieldId}-${index}`} rows={4} className={fieldClass} disabled={busy || failed} value={values[active]?.[field.key] ?? ''}
              onChange={(event) => setValues((previous) => ({ ...previous, [active]: { ...previous[active], [field.key]: event.target.value } }))} />}
        </div>)}
      </div>
      <div className="flex justify-end gap-2 border-t border-navy-100 px-6 py-4">
        <Button variant="ghost" disabled={saving} onClick={onClose}>{t('cms.cancel')}</Button>
        <Button variant="primary" disabled={busy || failed} onClick={save}>{t('cms.save')}</Button>
      </div>
    </Modal>
  );
}
