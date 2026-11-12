'use client';
import { Pencil } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen } from './CmsProvider';
import { GlobalSettingsModal } from './CmsModals';

export function EditableGlobalText({ settingKey, fallback }: { settingKey: string; fallback: string }) {
  const { t } = useIntl();
  const { getGlobal, isCmsEditing, localeTag } = useCms();
  const [open, setOpen] = useCmsEditorOpen();
  return <>
    <span data-cms-key={settingKey} data-cms-field-id={`settings.${settingKey}`} data-cms-source="company_settings" data-cms-locale={localeTag}
      className={isCmsEditing ? 'relative inline-block outline-dashed outline-1 outline-gold-400/60' : undefined}>
      {getGlobal(settingKey, fallback)}
      {isCmsEditing && <button type="button" data-cms-edit onClick={() => setOpen(true)} aria-label={t('cms.editText')}
        className="ml-2 inline-flex rounded bg-gold-500 p-1.5 text-white"><Pencil className="h-3.5 w-3.5" /></button>}
    </span>
    <GlobalSettingsModal open={open} onClose={() => setOpen(false)} onlyKeys={[settingKey]} fallbackValues={{ [settingKey]: { [localeTag]: fallback } }} />
  </>;
}
