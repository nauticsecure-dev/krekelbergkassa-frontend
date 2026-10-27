'use client';

import * as React from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useCms, useCmsEditorOpen, type LocaleTag } from './CmsProvider';

const fields = ['home.werf.cert', 'home.werf.cert_sub'] as const;
type Draft = Record<string, Partial<Record<LocaleTag, string>>>;

/** Edit both badge lines together, keeping the existing CMS keys and translations. */
export function EditableCertificationBadge() {
  const { t } = useIntl();
  const { isCmsEditing, retainCmsDrafts, getText, localeTag, editorLocales, saveText } = useCms();
  const { push, pushError } = useToast();
  const [open, setOpen] = useCmsEditorOpen();
  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  React.useEffect(() => { if (editorLocales.length && !editorLocales.includes(active)) setActive(editorLocales[0]); }, [active, editorLocales]);
  const [values, setValues] = React.useState<Draft>({});
  const [base, setBase] = React.useState<Draft>({});
  const [loading, setLoading] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fallback = [t('home.werf.cert'), 'HISWA · 1976'];

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setActive(localeTag);
    setLoading(true);
    setLoadFailed(false);
    void Promise.all(editorLocales.map(async (tag) => {
      const response = await cmsService.pageContent('home', tag) as {
        content_blocks?: Array<{ key: string; value: string }>;
      };
      return { tag, blocks: response.content_blocks ?? [] };
    })).then((results) => {
      if (cancelled) return;
      const draft: Draft = {};
      fields.forEach((key, index) => {
        draft[key] = Object.fromEntries(results.map(({ tag, blocks }) => [
          tag, blocks.find((block) => block.key === key)?.value || (tag === localeTag ? fallback[index] : ''),
        ]));
      });
      setValues(draft);
      setBase(draft);
    }).catch((error) => {
      if (!cancelled) {
        setLoadFailed(true);
        pushError(error, t('cms.loadError'));
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Load once per opening; saving must not reset unsaved input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localeTag]);

  const busy = loading || saving;
  const close = () => { if (!busy) setOpen(false); };
  const save = async () => {
    if (busy || loadFailed) return;
    setSaving(true);
    try {
      for (const key of fields) {
        const changed = Object.fromEntries(editorLocales
          .filter((tag) => (values[key]?.[tag] ?? '') !== (base[key]?.[tag] ?? ''))
          .map((tag) => [tag, values[key]?.[tag] ?? '']));
        if (!Object.keys(changed).length) continue;
        await saveText(key, { page: 'home', section: 'werf', type: 'short_text', value_by_locale: changed });
        // A failed second write can be retried without rewriting the first line.
        setBase((previous) => ({ ...previous, [key]: { ...values[key] } }));
      }
      push({ tone: 'success', title: t('cms.saved') });
      setOpen(false);
    } catch (error) {
      pushError(error, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div data-cms-badge="home.werf.cert" className="relative mt-4 w-fit max-w-full rounded-xl bg-white p-5 shadow-elev lg:absolute lg:-bottom-6 lg:-right-6 lg:mt-0">
        <ShieldCheck aria-hidden className="h-6 w-6 text-gold-500" />
        <div className="mt-2 break-words text-xs font-semibold uppercase tracking-widest text-navy-500">
          {getText(fields[0], fallback[0])}
        </div>
        <div className="break-words text-sm font-semibold text-navy-900">
          {getText(fields[1], fallback[1])}
        </div>
        {isCmsEditing && (
          <button type="button" data-cms-edit onClick={() => setOpen(true)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-navy-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={t('cms.editCertificationBadge')}>
            <Pencil aria-hidden className="h-4 w-4" />{t('cms.editCertificationBadge')}
          </button>
        )}
      </div>
      <Modal open={open && (isCmsEditing || retainCmsDrafts)} onClose={close} size="lg">
        <h2 className="border-b border-navy-100 px-6 py-5 pr-14 text-lg font-semibold text-navy-900">{t('cms.editCertificationBadge')}</h2>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div role="tablist" aria-label="Locale" className="flex flex-wrap gap-2">
            {editorLocales.map((tag) => (
              <button key={tag} type="button" role="tab" aria-selected={active === tag} disabled={busy}
                onClick={() => setActive(tag)} className={`rounded-md px-3 py-2 text-sm font-semibold ${active === tag ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600'}`}>
                {tag.slice(0, 2).toUpperCase()}
              </button>
            ))}
          </div>
          {loadFailed && <p role="alert" className="text-sm text-red-700">{t('cms.loadError')}</p>}
          {fields.map((key, index) => (
            <label key={key} className="block text-sm font-semibold text-navy-700">
              {t(index === 0 ? 'cms.certificationTitle' : 'cms.certificationSubtitle')}
              <input value={values[key]?.[active] ?? ''} disabled={busy || loadFailed}
                onChange={(event) => setValues((previous) => ({ ...previous, [key]: { ...previous[key], [active]: event.target.value } }))}
                className="mt-2 w-full rounded-lg border border-navy-200 px-3 py-2 font-normal text-navy-900" />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-navy-100 px-6 py-4">
          <Button variant="ghost" onClick={close} disabled={busy}>{t('cms.cancel')}</Button>
          <Button onClick={save} disabled={busy || loadFailed}>{t('cms.save')}</Button>
        </div>
      </Modal>
    </>
  );
}
