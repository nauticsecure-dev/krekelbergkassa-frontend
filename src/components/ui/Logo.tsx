'use client';

import * as React from 'react';
import Image from 'next/image';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from '@/components/cms/CmsProvider';
import { ImageEditModal } from '@/components/cms/CmsModals';

interface LogoProps {
  variant?: 'dark' | 'light';
  className?: string;
  /** When false, skip CMS edit affordances (e.g. admin chrome). */
  editable?: boolean;
}

export const SITE_LOGO_BLOCK_KEY = 'site.logo';
export const SITE_LOGO_PAGE = 'global';
export const SITE_LOGO_FALLBACK = '/img/krekelberg.webp';

export function Logo({ variant = 'dark', className, editable = true }: LogoProps) {
  const fg = variant === 'dark' ? 'text-navy-900' : 'text-white';
  const sub = variant === 'dark' ? 'text-navy-500' : 'text-sand-100/80';
  const { t } = useIntl();
  const { canEdit, editMode, getMedia } = useCms();
  const [open, setOpen] = React.useState(false);

  const block = getMedia(SITE_LOGO_BLOCK_KEY);
  // Keep last good CMS URL across brief refetch windows.
  const stickyCmsSrc = React.useRef<string | null>(block?.image_url || null);
  if (block?.image_url) stickyCmsSrc.current = block.image_url;

  const src = block?.image_url || stickyCmsSrc.current || SITE_LOGO_FALLBACK;
  const altText = block?.alt || 'Krekelberg Nautic logo';
  const showEditor = editable && canEdit && editMode;
  // Next/Image only allows known local paths; CMS URLs are often signed/S3.
  const useNextImage = src.startsWith('/');

  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Krekelberg Nautic">
      <span
        className={cn('relative shrink-0', showEditor && 'cursor-pointer')}
        onClick={
          showEditor
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(true);
              }
            : undefined
        }
      >
        {useNextImage ? (
          <Image
            src={src}
            alt={altText}
            width={54}
            height={76}
            priority={variant === 'dark'}
            className={cn('h-11 w-auto object-contain', showEditor && 'pointer-events-none')}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={altText}
            width={54}
            height={76}
            className={cn('h-11 w-auto object-contain', showEditor && 'pointer-events-none')}
          />
        )}

        {showEditor ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-sm outline-dashed outline-2 -outline-offset-1 outline-gold-400/70"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(true);
              }}
              aria-label={t('cms.editImage')}
              title={t('cms.editImage')}
              className="pointer-events-auto absolute -right-1 -top-1 z-30 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white opacity-95 shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <ImageEditModal
              open={open}
              onClose={() => setOpen(false)}
              blockKey={SITE_LOGO_BLOCK_KEY}
              page={SITE_LOGO_PAGE}
              fallbackSrc={SITE_LOGO_FALLBACK}
              aspect={54 / 76}
            />
          </>
        ) : null}
      </span>
      <div className="leading-tight">
        <div className={cn('font-display text-lg font-semibold tracking-tight', fg)}>
          KREKELBERG
        </div>
        <div className={cn('-mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em]', sub)}>
          Nautic · Jachtmakelaar
        </div>
      </div>
    </div>
  );
}
