'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { TextEditModal } from './CmsModals';

type AsTag = keyof React.JSX.IntrinsicElements;

interface EditableTextProps {
  /** Stable content-block key, e.g. `diensten.winterstalling.hero.title`. */
  blockKey: string;
  /** Page slug this block belongs to (used in the upsert payload). */
  page: string;
  /** Optional logical section, e.g. `hero`. */
  section?: string;
  /** Block type — `short_text` for headings, `rich_text`/`long_text` for prose. */
  type?: string;
  /** Element to render the resolved text as. Defaults to `<span>`. */
  as?: AsTag;
  className?: string;
  /** Hardcoded fallback rendered when no CMS block exists (card item 9). */
  children: React.ReactNode;
}

/** Extract the plain-text default from `children` for seeding the editor. */
function childrenToText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childrenToText).join('');
  if (React.isValidElement(node)) {
    return childrenToText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

export function EditableText({
  blockKey,
  page,
  section,
  type = 'short_text',
  as,
  className,
  children,
}: EditableTextProps) {
  const { canEdit, editMode, getText } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = React.useState(false);

  const fallbackText = React.useMemo(() => childrenToText(children), [children]);
  const stored = getText(blockKey, '');
  const Tag = (as ?? 'span') as AsTag;

  // Render the stored value when present, otherwise the hardcoded children so
  // the public site is unchanged until a first edit upserts the key.
  const content: React.ReactNode = stored ? stored : children;

  if (!canEdit || !editMode) {
    return <Tag className={className}>{content}</Tag>;
  }

  return (
    <span className={cn('group/cms relative inline-block', className && 'block')}>
      <Tag className={cn('outline-dashed outline-1 outline-gold-400/60', className)}>
        {content}
      </Tag>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('cms.editText')}
        title={t('cms.editText')}
        className="absolute -right-2 -top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white opacity-0 shadow-md transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 group-hover/cms:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <TextEditModal
        open={open}
        onClose={() => setOpen(false)}
        blockKey={blockKey}
        page={page}
        section={section}
        type={type}
        fallbackText={fallbackText}
      />
    </span>
  );
}
