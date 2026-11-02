'use client';
import * as React from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { useCompanyContact } from '@/lib/hooks/useCompanyContact';
import { getApiErrorMessage } from '@/lib/api-error';
import { useCms, useCmsEditorOpen } from './CmsProvider';

type Field = 'email' | 'phone' | 'address';

export function EditableContactValue({ field, contact, children }: {
  field: Field; contact: ReturnType<typeof useCompanyContact>; children: React.ReactNode;
}) {
  const { isCmsEditing, saveContact } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = useCmsEditorOpen();
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const keys = field === 'address' ? ['street', 'postal_code', 'city'] : [field];
  const start = (event: React.SyntheticEvent) => {
    event.preventDefault(); event.stopPropagation();
    setDraft(field === 'address' ? {
      street: contact.company?.address.street ?? contact.street,
      postal_code: contact.company?.address.postal_code ?? contact.zip,
      city: contact.company?.address.city ?? contact.city,
    } : { [field]: contact[field] });
    setError(''); setOpen(true);
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!isCmsEditing || saving) return;
    setSaving(true); setError('');
    try {
      const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
      await saveContact(field === 'address'
        ? { address: { street: values.street, postal_code: values.postal_code, city: values.city, country: contact.company?.address.country ?? 'NL' } }
        : { [field]: values[field] });
      setOpen(false);
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
    <Modal open={open} onClose={() => { if (!saving) setOpen(false); }}>
      <form onSubmit={save} className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('cms.contact.edit')}: {t('contactPage.' + field + 'Label')}</h2>
        {keys.map(key => <label key={key} className="block text-sm">
          {t('cms.contact.' + key)}
          <input className="input-base mt-1 w-full" type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
            required maxLength={key === 'phone' ? 30 : key === 'postal_code' ? 20 : key === 'city' ? 100 : 255}
            value={draft[key] ?? ''} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />
        </label>)}
        {field !== 'address' && <p className="text-xs text-navy-500">{field === 'email' ? 'mailto:' + (draft.email ?? '') : 'tel:' + (draft.phone ?? '').replace(/\(0\)/g, '').replace(/[^+\d]/g, '')}</p>}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>{t('cms.cancel')}</Button>
          <Button type="submit" disabled={saving}>{t('cms.save')}</Button>
        </div>
      </form>
    </Modal>
  </>;
}
