'use client';
import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useIntl } from '@/i18n/IntlProvider';
import { TextEditModal } from './CmsModals';

function flatten(value: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [[path, child] as [string, string]]
      : child && typeof child === 'object' ? flatten(child as Record<string, unknown>, path) : [];
  });
}

/** Includes labels used in attributes and menus that cannot contain inline controls. */
export function TranslationCatalog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, messages } = useIntl();
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<[string, string] | null>(null);
  const entries = React.useMemo(() => flatten(messages), [messages]);
  return <>
    <Modal open={open && !selected} onClose={onClose} size="lg">
      <div className="p-6"><h2 className="mb-4 text-lg font-semibold">{t('cms.allTranslations')}</h2>
        <input className="w-full rounded border p-2" aria-label={t('cms.searchTranslations')}
          placeholder={t('cms.searchTranslations')} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="overflow-y-auto px-6 pb-6">
        {entries.filter(([key, value]) => `${key} ${value}`.toLowerCase().includes(query.toLowerCase())).map(([key, value]) =>
          <button type="button" key={key} className="block w-full border-b p-3 text-left hover:bg-sand-50"
            onClick={() => setSelected([key, value])}><span className="block text-xs text-navy-500">{key}</span>{t(key)}</button>)}
      </div>
    </Modal>
    {selected ? <TextEditModal open onClose={() => setSelected(null)} page="global"
      blockKey={`i18n.${selected[0]}`} fallbackText={selected[1]} /> : null}
  </>;
}
