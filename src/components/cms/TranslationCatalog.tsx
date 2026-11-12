'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useIntl } from '@/i18n/IntlProvider';
import { TextEditModal } from './CmsModals';
import copyFallbacks from '@/i18n/cms-copy.json';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { cmsService } from '@/lib/services';

function flatten(value: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [[path, child] as [string, string]]
      : child && typeof child === 'object' ? flatten(child as Record<string, unknown>, path) : [];
  });
}

const craneTypes = ['receipt', 'internal', 'approved', 'rejected', 'payment_optional', 'payment_required', 'paid', 'reminder_15', 'reminder_30', 'reminder_60'];

function CraneEmailPreview() {
  const { t, locale } = useIntl();
  const { push, pushError } = useToast();
  const [language, setLanguage] = React.useState<string>(locale);
  const [type, setType] = React.useState('receipt');
  const [draft, setDraft] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<{ subject: string; html: string } | null>(null);

  const run = async (send: boolean) => {
    setBusy(true);
    const template = { locale: language, type, draft };
    try {
      if (send) {
        await cmsService.testCraneEmail(template);
        push({ tone: 'success', title: t('crane.templateSent') });
      } else {
        setPreview(await cmsService.previewCraneEmail(template));
      }
    } catch (error) {
      pushError(error, t('crane.templatePreview'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="mb-4 rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">{t('crane.templatePreview')}</summary>
      <fieldset disabled={busy} className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-3">
          <label>{t('crane.templateType')}
            <select className="ms-2 rounded border p-1" value={type} onChange={(event) => {
              setType(event.target.value);
              setPreview(null);
            }}>
              {craneTypes.map((value) => <option key={value} value={value}>{t(`crane.mailType.${value}`)}</option>)}
            </select>
          </label>
          <label>{t('crane.templateLocale')}
            <select className="ms-2 rounded border p-1" value={language} onChange={(event) => {
              setLanguage(event.target.value);
              setPreview(null);
            }}>
              {['nl', 'en', 'de', 'fr'].map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
        <label className="block"><input type="checkbox" className="me-2" checked={draft} onChange={(event) => {
          setDraft(event.target.checked);
          setPreview(null);
        }} />{t('crane.templateDraft')}</label>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void run(false)}>{t('crane.templateRender')}</Button>
          <Button size="sm" variant="outline" onClick={() => void run(true)}>{t('crane.templateTestSend')}</Button>
        </div>
      </fieldset>
      {preview && (
        <div className="mt-3">
          <p className="mb-2 font-semibold">{preview.subject}</p>
          <iframe className="h-80 w-full rounded border" title={t('crane.templateRender')} sandbox="" srcDoc={preview.html} />
        </div>
      )}
    </details>
  );
}

/** Includes labels used in attributes and menus that cannot contain inline controls. */
export function TranslationCatalog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, messages } = useIntl();
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<[string, string] | null>(null);
  const entries = React.useMemo(() => Array.from(new Map([...Object.entries(copyFallbacks), ...flatten(messages)])), [messages]);
  return <>
    <Modal open={open && !selected} onClose={onClose} size="lg">
      <div className="p-6"><h2 className="mb-4 text-lg font-semibold">{t('cms.allTranslations')}</h2>
        {open && <CraneEmailPreview />}
        <input data-cms-catalog-search className="w-full rounded border p-2" aria-label={t('cms.searchTranslations')}
          placeholder={t('cms.searchTranslations')} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="overflow-y-auto px-6 pb-6">
        {entries.filter(([key, value]) => `${key} ${t(key, { defaultValue: value })}`.toLowerCase().includes(query.toLowerCase())).map(([key, value]) =>
          <button type="button" key={key} data-cms-catalog-key={key} className="block w-full border-b p-3 text-left hover:bg-sand-50"
            onClick={() => setSelected([key, value])}><span className="block text-xs text-navy-500">{key}</span>{t(key, { defaultValue: value })}</button>)}
      </div>
    </Modal>
    {selected ? <TextEditModal open onClose={() => setSelected(null)} page="global"
      blockKey={`i18n.${selected[0]}`} fallbackText={selected[1]} /> : null}
  </>;
}
