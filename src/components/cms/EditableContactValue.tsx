'use client';
import * as React from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { useCompanyContact } from '@/lib/hooks/useCompanyContact';
import { getApiErrorMessage } from '@/lib/api-error';
import { cmsService } from '@/lib/services';
import { useCms, useCmsEditorOpen } from './CmsProvider';

type Field = 'email' | 'phone' | 'address';

export function EditableContactValue({ field, contact, children }: {
  field: Field; contact: ReturnType<typeof useCompanyContact>; children: React.ReactNode;
}) {
  const { isCmsEditing, saveContact } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = useCmsEditorOpen();
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [original, setOriginal] = React.useState<Record<string, string>>({});
  const [revisions, setRevisions] = React.useState<Record<string, string | null> | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const loadId = React.useRef(0);
  const keys = field === 'address' ? ['street', 'postal_code', 'city'] : [field];
  const settingKey = (key: string) => field === 'address' ? 'company.address.' + key : 'company.' + key;
  const close = () => { loadId.current++; setOpen(false); };
  const start = async (event: React.SyntheticEvent) => {
    event.preventDefault(); event.stopPropagation();
    const fallbacks: Record<string, string> = field === 'address'
      ? { street: contact.street, postal_code: contact.zip, city: contact.city } : { [field]: contact[field] };
    const id = ++loadId.current;
    setRevisions(null);
    setError(''); setOpen(true);
    try {
      const { settings, revisions } = await cmsService.globalSettings();
      if (id !== loadId.current) return;
      const values = Object.fromEntries(keys.map(key => {
        const stored = settings[settingKey(key)];
        return [key, typeof stored === 'string' ? stored : fallbacks[key] ?? ''];
      }));
      if (keys.some(key => !Object.hasOwn(revisions, settingKey(key)))) throw new Error(t('cms.loadError'));
      setDraft(values); setOriginal(values); setRevisions(revisions);
    } catch (err) { if (id === loadId.current) setError(getApiErrorMessage(err)); }
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!isCmsEditing || saving || !revisions) return;
    setSaving(true); setError('');
    try {
      const values = Object.fromEntries(keys.filter(key => draft[key] !== original[key]).map(key => [key, draft[key].trim()]));
      const expected_revisions = Object.fromEntries(Object.keys(values).map(key => [settingKey(key), revisions[settingKey(key)]]));
      if (Object.keys(values).length) await saveContact({
        ...(field === 'address' ? { address: values } : values), expected_revisions,
      });
      close();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setSaving(false); }
  }
  return <>
    <span data-contact-value={field} className={isCmsEditing ? 'relative inline-block outline-dashed outline-1 outline-gold-400/60' : undefined}>
      <span onClick={isCmsEditing ? start : undefined}>{children}</span>
      {isCmsEditing && <button type="button" data-cms-edit onClick={start}
        aria-label={t('cms.contact.edit') + ': ' + t('contactPage.' + field + 'Label')}
        className="absolute -right-5 -top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white shadow-md">
        <Pencil className="h-3.5 w-3.5" />
      </button>}
    </span>
    <Modal open={open} onClose={() => { if (!saving) close(); }}>
      <form onSubmit={save} className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('cms.contact.edit')}: {t('contactPage.' + field + 'Label')}</h2>
        <fieldset disabled={!revisions || saving} className="space-y-4">
        {keys.map(key => <label key={key} className="block text-sm">
          {t('cms.contact.' + key)}
          <input data-cms-setting-input={settingKey(key)} className="input-base mt-1 w-full" type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
            required maxLength={key === 'phone' ? 30 : key === 'postal_code' ? 20 : key === 'city' ? 100 : 255}
            value={draft[key] ?? ''} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />
        </label>)}
        </fieldset>
        {field !== 'address' && <p className="text-xs text-navy-500">{field === 'email' ? 'mailto:' + (draft.email ?? '') : 'tel:' + (draft.phone ?? '').replace(/\(0\)/g, '').replace(/[^+\d]/g, '')}</p>}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={close}>{t('cms.cancel')}</Button>
          <Button type="submit" data-cms-save disabled={saving || !revisions}>{t('cms.save')}</Button>
        </div>
      </form>
    </Modal>
  </>;
}
