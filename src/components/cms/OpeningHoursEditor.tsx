'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { useQuery } from '@/lib/hooks/useAsync';
import { cmsService, type CmsOpeningHour } from '@/lib/services';
import { useCms, useCmsEditorOpen } from './CmsProvider';

export function OpeningHoursEditor({ onSaved }: { onSaved: () => void }) {
  const { isCmsEditing } = useCms();
  const [open, setOpen] = useCmsEditorOpen();
  const { t } = useIntl();
  return <>
    {isCmsEditing && <button type="button" data-cms-edit-opening-hours onClick={() => setOpen(true)}
      aria-label={t('cms.openingHours')} title={t('cms.openingHours')}
      className="inline-flex rounded bg-gold-500 p-1.5 text-white"><Pencil className="h-3.5 w-3.5" /></button>}
    {open && <OpeningHoursDialog onClose={() => setOpen(false)} onSaved={onSaved} />}
  </>;
}

function OpeningHoursDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useIntl();
  const { guardCms, localeTag } = useCms();
  const { pushError } = useToast();
  const { data, error, loading } = useQuery([], () => guardCms(() => cmsService.openingHours()));
  const [draft, setDraft] = useState<CmsOpeningHour | null>(null);
  const [busy, setBusy] = useState(false);
  const weekday = new Intl.DateTimeFormat(localeTag, { weekday: 'long', timeZone: 'UTC' });
  const hours = [...(data?.regular ?? [])].sort((a, b) => (a.day_of_week + 6) % 7 - (b.day_of_week + 6) % 7);

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const original = hours.find(hour => hour.id === draft.id);
      if (!original) return;
      const { open_from, open_until, is_closed } = draft;
      await guardCms(() => cmsService.saveOpeningHour(draft.id, {
        ...(original.open_from !== open_from ? { open_from } : {}),
        ...(original.open_until !== open_until ? { open_until } : {}),
        ...(original.is_closed !== is_closed ? { is_closed } : {}),
      }, draft.cms_revision));
      onSaved();
      onClose();
    } catch (error) {
      pushError(error, t('cms.saveError'));
    } finally {
      setBusy(false);
    }
  }

  return <Modal open onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="space-y-4 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold">{t('cms.openingHours')}</h2>
        {loading ? <p role="status">{t('adminNew.common.loading')}</p> : error ? <p role="alert">{t('cms.loadError')}</p> : <>
          <label className="block">
            {t('adminNew.calendar.fields.dayOfWeek')}
            <select className="input-base mt-1 w-full" data-cms-opening-day value={draft?.id ?? ''}
              disabled={busy} onChange={event => setDraft(hours.find(hour => hour.id === event.target.value) ?? null)}>
              <option value="">—</option>
              {hours.map(hour => <option key={hour.id} value={hour.id}>{weekday.format(new Date(Date.UTC(2024, 0, 7 + hour.day_of_week)))}</option>)}
            </select>
          </label>
          {draft && <fieldset disabled={busy} className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={draft.is_closed} onChange={event => setDraft({ ...draft, is_closed: event.target.checked })} />
              {t('adminNew.calendar.fields.closedDay')}
            </label>
            <label>
              {t('adminNew.calendar.fields.openFrom')}
              <input type="time" className="input-base mt-1 w-full" data-cms-opening-from
                disabled={draft.is_closed} required value={draft.open_from ?? ''}
                onChange={event => setDraft({ ...draft, open_from: event.target.value || null })} />
            </label>
            <label>
              {t('adminNew.calendar.fields.openUntil')}
              <input type="time" className="input-base mt-1 w-full"
                disabled={draft.is_closed} required value={draft.open_until ?? ''}
                onChange={event => setDraft({ ...draft, open_until: event.target.value || null })} />
            </label>
          </fieldset>}
          {hours.length < 7 && <Link className="text-marine-700 underline" href={`/${locale}/admin/kalender`}>{t('adminNew.calendar.title')}</Link>}
        </>}
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>{t('cms.cancel')}</Button>
        <Button type="submit" data-cms-save disabled={busy || !draft}>{t('cms.save')}</Button>
      </div>
    </form>
  </Modal>;
}
