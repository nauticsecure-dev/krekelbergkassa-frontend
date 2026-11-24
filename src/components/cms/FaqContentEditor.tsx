'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type Question = { cat: string; q: string; a: string; order?: number; active?: boolean };

/** Edit the canonical FAQ settings, including inactive rows, rather than shadow copy. */
export function FaqContentEditor({ defaults, onSaved }: { defaults: Question[]; onSaved: () => void }) {
  const { isCmsEditing, guardCms } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [revision, setRevision] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!isCmsEditing) return null;
  async function load() {
    setBusy(true); setError('');
    try {
      const record = await guardCms(() => api<{ questions_raw: Question[]; cms_revision: string }>('/v1/admin/settings/faq'));
      const rows = record.questions_raw;
      setQuestions(rows?.length ? rows : defaults.map(q => ({ ...q })));
      setRevision(String(record.cms_revision)); setOpen(true);
    } catch (error) { setError(getApiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      await guardCms(() => api('/v1/admin/settings/faq', { method: 'PATCH', body: { questions, expected_revision: revision } }));
      onSaved(); setOpen(false);
    } catch (error) { setError(getApiErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="container-wide my-4">
    <button type="button" disabled={busy} onClick={() => void load()} className="rounded bg-gold-500 px-4 py-2 text-navy-900">{t('faqEditor.title')}</button>
    {!open && error && <p role="alert">{error}</p>}
    <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} size="lg">
      <form className="space-y-4 p-6" onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 className="text-xl font-bold">{t('faqEditor.title')}</h2>
        <p>{t('faqEditor.shared')}</p>
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={busy} className="space-y-4">
          {questions.map((question, index) => <div key={index} className="space-y-2 rounded border p-3">
            <label className="block">{t('faqEditor.question')} {index + 1}<input required className="block w-full rounded border p-2" value={question.q}
              onChange={event => { const value = event.target.value; setQuestions(rows => rows.map((row, i) => i === index ? { ...row, q: value } : row)); }} /></label>
            <label className="block">{t('faqEditor.answer')} {index + 1}<textarea required className="block w-full rounded border p-2" value={question.a}
              onChange={event => { const value = event.target.value; setQuestions(rows => rows.map((row, i) => i === index ? { ...row, a: value } : row)); }} /></label>
          </div>)}
          <button type="submit" className="rounded bg-gold-500 px-4 py-2 text-navy-900">{t('cms.save')}</button>
        </fieldset>
      </form>
    </Modal>
  </div>;
}
