'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Pencil } from 'lucide-react';
import { buttonClassName } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen } from './CmsProvider';
import { GlobalSettingsModal } from './CmsModals';
import { headerHref } from './header-destination';

export function EditableHeaderCta({ mobile = false }: { mobile?: boolean }) {
  const { isCmsEditing, getGlobal } = useCms();
  const { locale, t } = useIntl();
  const [open, setOpen] = useCmsEditorOpen();
  const label = getGlobal('header.cta.label', 'Stalling');
  const contents = <>{label}{isCmsEditing ? <Pencil className="h-4 w-4" /> : !mobile ? <ArrowRight className="h-4 w-4" /> : null}</>;
  const className = buttonClassName({ variant: 'gold', size: 'md', className: mobile ? 'w-full' : undefined });
  return <>
    {isCmsEditing ? <button type="button" data-cms-edit className={className} aria-label={t('cms.editCta')}
      onClick={() => setOpen(true)}>{contents}</button>
      : <Link className={className} href={headerHref(getGlobal('header.cta.path', 'diensten/winterstalling'), locale)}>{contents}</Link>}
    <GlobalSettingsModal open={open} onClose={() => setOpen(false)} headerOnly />
  </>;
}
