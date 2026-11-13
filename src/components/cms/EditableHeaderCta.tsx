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
  const { isCmsEditing, getGlobal, localeTag } = useCms();
  const { locale, t } = useIntl();
  const [open, setOpen] = useCmsEditorOpen();
  const label = getGlobal('header.cta.label', 'Stalling');
  const href = headerHref(getGlobal('header.cta.path', 'diensten/winterstalling'), locale);
  const pathSource = { 'data-cms-key': 'header.cta.path', 'data-cms-field-id': 'settings.header.cta.path',
    'data-cms-source': 'company_settings', 'data-cms-locale': localeTag };
  const contents = <><span data-cms-key="header.cta.label" data-cms-field-id="settings.header.cta.label"
    data-cms-source="company_settings" data-cms-locale={localeTag}>{label}</span>
    {isCmsEditing ? <Pencil className="h-4 w-4" /> : !mobile ? <ArrowRight className="h-4 w-4" /> : null}</>;
  const className = buttonClassName({ variant: 'gold', size: 'md', className: mobile ? 'w-full' : undefined });
  return <>
    {isCmsEditing ? <button {...pathSource} type="button" data-cms-edit className={className} aria-label={t('cms.editCta')}
      onClick={() => setOpen(true)}>{contents}</button>
      : <Link {...pathSource} className={className} href={href}>{contents}</Link>}
    <GlobalSettingsModal open={open} onClose={() => setOpen(false)} headerOnly />
  </>;
}
