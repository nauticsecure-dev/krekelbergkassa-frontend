'use client';

import * as React from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { useCms } from './CmsProvider';

type Subject = {
  id?: string;
  key: string;
  label_nl: string;
  label_en: string;
  label_de: string;
  label_fr: string | null;
  category: string;
  recipient_email: string | null;
  sort_order: number;
  active: boolean;
};
const emptySubject: Subject = {
  key: '', label_nl: '', label_en: '', label_de: '', label_fr: '',
  category: 'general', recipient_email: '', sort_order: 0, active: true,
};

export function ContactSubjectsEditor() {
  const { guardCms, isCmsEditing } = useCms();
  const { t } = useIntl();
  const subjects = useQuery([], () => api<{ data: Subject[] }>('/v1/admin/contact-subjects'));
  const [draft, setDraft] = React.useState<Subject>(emptySubject);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !isCmsEditing) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const { id, ...payload } = draft;
      await guardCms(() => api(`/v1/admin/contact-subjects${id ? '/' + encodeURIComponent(id) : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: { ...payload, recipient_email: payload.recipient_email || null, label_fr: payload.label_fr || null },
      }));
      await subjects.refetch();
      setDraft(emptySubject); setSaved(true);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return <section className="space-y-4">
    <h2 className="heading-display text-2xl">{t('contactSubjects.title')}</h2>
    <p className="text-sm text-navy-500">{t('contactSubjects.description')}</p>
    {(error || subjects.error) && <p role="alert" className="text-sm text-rose-700">{error || subjects.error}</p>}
    {subjects.error && <Button onClick={() => void subjects.refetch().catch(() => undefined)}>{t('contactSubjects.retry')}</Button>}
    {saved && <p role="status" className="text-sm text-emerald-700">{t('contactSubjects.saved')}</p>}
    <div className="flex flex-wrap gap-2" aria-busy={subjects.loading}>
      {subjects.data?.data.map(subject => <button key={subject.id} type="button" disabled={saving}
        aria-pressed={draft.id === subject.id}
        onClick={() => { setDraft(subject); setSaved(false); setError(''); }}
        className="rounded-lg border border-navy-200 px-3 py-2 text-left text-sm hover:bg-sand-50">
        {subject.sort_order} · {subject.label_nl} · {t(subject.active ? 'contactSubjects.active' : 'contactSubjects.inactive')}
      </button>)}
      <Button variant="outline" disabled={saving} onClick={() => { setDraft(emptySubject); setSaved(false); }}>{t('contactSubjects.add')}</Button>
    </div>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={saving || subjects.loading || Boolean(subjects.error)} className="contents">
        <label className="grid gap-1 text-sm">{t('contactSubjects.key')}
          <input className="input-base" required maxLength={100} value={draft.key} disabled={Boolean(draft.id)} onChange={e => setDraft({ ...draft, key: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">{t('contactSubjects.category')}
          <input className="input-base" required maxLength={30} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} />
        </label>
        {(['nl', 'en', 'de', 'fr'] as const).map(lang => <label key={lang} className="grid gap-1 text-sm">
          {t('contactSubjects.label')} ({lang.toUpperCase()})
          <input className="input-base" required maxLength={255} value={draft[`label_${lang}`] ?? ''} onChange={e => setDraft({ ...draft, [`label_${lang}`]: e.target.value })} />
        </label>)}
        <label className="grid gap-1 text-sm">{t('contactSubjects.recipient')}
          <input className="input-base" type="email" maxLength={255} value={draft.recipient_email ?? ''} onChange={e => setDraft({ ...draft, recipient_email: e.target.value })} />
          <span className="text-xs text-navy-500">{t('contactSubjects.fallback')}</span>
        </label>
        <label className="grid gap-1 text-sm">{t('contactSubjects.order')}
          <input className="input-base" type="number" required min={0} max={9999} value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />{t('contactSubjects.active')}</label>
        <Button type="submit" disabled={saving || subjects.loading || Boolean(subjects.error)}>{t(saving ? 'contactSubjects.saving' : 'contactSubjects.save')}</Button>
      </fieldset>
    </form>
  </section>;
}
