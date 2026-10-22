'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { TextEditModal } from './CmsModals';

type AsTag = keyof React.JSX.IntrinsicElements;

const BLOCK_TAGS = new Set<string>([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'article',
  'section',
  'ul',
  'ol',
]);

/** Block text must not be wrapped in a span — browsers re-parent <p> out of <span>. */
function usesBlockWrapper(as: AsTag | undefined, className?: string) {
  if (as && BLOCK_TAGS.has(as)) return true;
  if (!className) return false;
  return /\b(block|line-clamp-\d+|flex|inline-flex|grid|w-full)\b/.test(className);
}

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
  const block = usesBlockWrapper(as, className);
  const Wrap = block ? 'div' : 'span';

  // Render the stored value when present, otherwise the hardcoded children so
  // the public site is unchanged until a first edit upserts the key.
  const content: React.ReactNode = stored ? stored : children;

  if (!canEdit || !editMode) {
    return <Tag className={className}>{content}</Tag>;
  }

  const openEditor = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <Wrap
      className={cn(
        'group/cms pointer-events-auto relative',
        block ? 'block' : 'inline-block',
      )}
      onClick={openEditor}
    >
      <Tag className={cn('outline-dashed outline-1 outline-gold-400/60', className)}>
        {content}
      </Tag>
      <button
        type="button"
        onClick={openEditor}
        aria-label={t('cms.editText')}
        title={t('cms.editText')}
        className="absolute -right-1 -top-1 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white opacity-0 shadow-md transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 group-hover/cms:opacity-100"
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
    </Wrap>
  );
}
