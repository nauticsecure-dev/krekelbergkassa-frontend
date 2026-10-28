'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen, type ImageStyle } from './CmsProvider';
import { ImageEditModal } from './CmsModals';
import { CmsImage } from './CmsImage';

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
  defaultStyle?: ImageStyle;
}

/**
 * Renders a CMS-managed image. The stored media block (if any) controls the
 * source, the `object-position` from its focal point, and a dark overlay. When
 * no block exists, `fallbackSrc` renders so the public site is unchanged.
 *
 * While the page-content request is in flight, prefer a session-cached CMS URL
 * over `fallbackSrc` so a reload does not flash the stock photo before the
 * uploaded image appears.
 */
export function EditableImage({
  blockKey,
  page,
  className,
  alt,
  fallbackSrc,
  defaultStyle,
}: EditableImageProps) {
  const { isCmsEditing, retainCmsDrafts, getMedia, isPageReady } = useCms();
  const { t } = useIntl();
  const [open, setOpen] = useCmsEditorOpen();

  const block = getMedia(blockKey);
  const pageReady = isPageReady(page);
  // Keep the last good CMS URL across brief ready=false refetch windows.
  const stickyCmsSrc = React.useRef<string | null>(block?.image_url || null);
  if (block?.image_url) stickyCmsSrc.current = block.image_url;

  const src =
    block?.image_url ||
    stickyCmsSrc.current ||
    (pageReady ? fallbackSrc : null);

  const altText = block?.alt ?? alt ?? '';
  const focal = block?.focal_point ?? { x: 50, y: 50 };
  const overlay = block?.overlay ?? 0;
  const imageStyle = { ...defaultStyle, ...block?.image_style };
  const alignedFocal = imageStyle.alignment ? {x: imageStyle.alignment === 'left' ? 0 : imageStyle.alignment === 'right' ? 100 : 50, y: focal.y} : focal;

  const editable = isCmsEditing;

  return (
    <>
      <span
        data-cms-block={blockKey}
        className={cn(
          'group/cms relative block overflow-hidden',
          !src && 'bg-navy-950',
          editable && 'cursor-pointer',
          className,
        )}
        onClick={editable ? (event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        } : undefined}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <CmsImage
            src={src}
            alt={altText}
            title={block?.seo_title}
            className={cn('h-full w-full object-cover', editable && 'pointer-events-none')}
            focal={alignedFocal}
            crop={block?.crop_data}
            srcSet={block?.src_set}
            mobileSrc={block?.mobile_image_url}
            mobileSrcSet={block?.mobile_src_set}
            mobileCrop={block?.mobile_crop_data}
            mobileFocal={block?.mobile_focal_point}
            dimensions={block?.image_dimensions}
            mobileDimensions={block?.mobile_image_dimensions}
            filter={`brightness(${imageStyle.brightness ?? 100}%) contrast(${imageStyle.contrast ?? 100}%) saturate(${imageStyle.saturation ?? 100}%)`}
          />
        ) : null}
        {imageStyle.gradient && imageStyle.gradient !== 'none' && <span aria-hidden className="pointer-events-none absolute inset-0"
          style={{background: `linear-gradient(to ${imageStyle.gradient}, rgba(8,19,38,${imageStyle.gradient_start ?? .9}), rgba(8,19,38,${imageStyle.gradient_middle ?? ((imageStyle.gradient_start ?? .9) + (imageStyle.gradient_end ?? .35)) / 2}), rgba(8,19,38,${imageStyle.gradient_end ?? .35}))`}} />}
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
              data-cms-edit
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
              aria-label={t('cms.editImage')}
              title={t('cms.editImage')}
              className="pointer-events-auto absolute right-2 top-2 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-white opacity-90 shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 hover:opacity-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </span>
      {editable || retainCmsDrafts ? (
        <ImageEditModal
          open={open}
          onClose={() => setOpen(false)}
          blockKey={blockKey}
          page={page}
          fallbackSrc={fallbackSrc}
          defaultStyle={defaultStyle}
        />
      ) : null}
    </>
  );
}
