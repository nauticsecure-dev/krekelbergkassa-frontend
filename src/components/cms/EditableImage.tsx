'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { ImageEditModal } from './CmsModals';

interface EditableImageProps {
  /** Stable media-block key, e.g. `diensten.winterstalling.hero.image`. */
  blockKey: string;
  /** Page slug this media block belongs to. */
  page: string;
  className?: string;
  /** Fallback alt text when no CMS alt is set. */
  alt?: string;
  /** Hardcoded source used until a CMS image is uploaded. */
  fallbackSrc: string;
}

/**
 * Renders a CMS-managed image. The stored media block (if any) controls the
 * source, the `object-position` from its focal point, and a dark overlay. When
 * no block exists, `fallbackSrc` renders so the public site is unchanged.
 */
export function EditableImage({
  blockKey,
  page,
  className,
  alt,
  fallbackSrc,
}: EditableImageProps) {
  const { canEdit, editMode, getMedia } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = React.useState(false);

  const block = getMedia(blockKey);
  const src = block?.image_url || fallbackSrc;
  const altText = block?.alt || alt || '';
  const focal = block?.focal_point ?? { x: 50, y: 50 };
  const overlay = block?.overlay ?? 0;

  const editable = canEdit && editMode;

  return (
    <span className={cn('group/cms relative block overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={altText}
        className="h-full w-full object-cover"
        style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
      />
      {overlay > 0 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `rgba(8, 19, 38, ${overlay})` }}
        />
      ) : null}

      {editable ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 outline-dashed outline-2 -outline-offset-2 outline-gold-400/70"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
            aria-label={t('cms.editImage')}
            title={t('cms.editImage')}
            className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-white opacity-0 shadow-md transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 group-hover/cms:opacity-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ImageEditModal
            open={open}
            onClose={() => setOpen(false)}
            blockKey={blockKey}
            page={page}
            fallbackSrc={fallbackSrc}
          />
        </>
      ) : null}
    </span>
  );
}
