'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { GlobalTextEditModal } from './CmsModals';

type AsTag = keyof React.JSX.IntrinsicElements;

interface EditableGlobalTextProps {
  /** Global setting key, e.g. `header.cta.label`. Must use a CMS prefix. */
  settingKey: string;
  /** Value rendered when the setting is not stored yet. */
  fallback: string;
  /** Element to render the text as. Defaults to `<span>`. */
  as?: AsTag;
  className?: string;
  /** Modal heading; defaults to the generic "edit text" label. */
  title?: string;
}

/**
 * Inline-editable global setting (header/footer/contact details).
 *
 * Content blocks are fetched per page, so anything rendered outside the page
 * body — the header CTA in particular — has to live in global settings to stay
 * available on every route. This is the inline affordance for that store.
 */
export function EditableGlobalText({
  settingKey,
  fallback,
  as,
  className,
  title,
}: EditableGlobalTextProps) {
  const { canEdit, editMode, getGlobal } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = React.useState(false);

  const Tag = (as ?? 'span') as AsTag;
  const text = getGlobal(settingKey, fallback);

  if (!canEdit || !editMode) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <span className={cn('group/cms relative isolate inline-block', className && 'block')}>
      <Tag
        className={cn(
          'inline-flex min-h-6 cursor-pointer items-center outline-dashed outline-1 outline-gold-400/60',
          className,
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {text}
      </Tag>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`${t('cms.editText')}: ${settingKey}`}
        title={settingKey}
        className="absolute -right-3 -top-3 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-white shadow-md transition hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <GlobalTextEditModal
        open={open}
        onClose={() => setOpen(false)}
        settingKey={settingKey}
        fallback={fallback}
        title={title}
      />
    </span>
  );
}
