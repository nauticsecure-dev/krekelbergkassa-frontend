'use client';
import * as React from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen } from './CmsProvider';
import { TextEditModal } from './CmsModals';

/** A text-only trigger remains valid inside links, buttons and headings. */
export function TranslatedText({ textKey, vars }: {
  textKey: string; vars?: Record<string, string | number | undefined>;
}) {
  const { t, messages } = useIntl();
  const { isCmsEditing, retainCmsDrafts } = useCms();
  const [open, setOpen] = useCmsEditorOpen();
  const surface = React.useRef<HTMLSpanElement>(null);
  const [nested, setNested] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!isCmsEditing) return;
    const parent = surface.current?.parentElement?.closest('a, button, [role="button"], [role="link"]');
    setNested(!!parent);
    if (!parent) return;
    // Let the existing link/button act as the editor trigger. There must be no
    // second interactive control inside it, and padding/icons must not navigate.
    const activate = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    parent.addEventListener('click', activate, true);
    parent.addEventListener('keydown', activate, true);
    return () => {
      parent.removeEventListener('click', activate, true);
      parent.removeEventListener('keydown', activate, true);
    };
  }, [isCmsEditing, setOpen]);
  const text = t(textKey, vars);
  if (!isCmsEditing && !retainCmsDrafts) return <>{text}</>;
  const raw = textKey.split('.').reduce<unknown>((value, key) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, messages);
  const activate = (event: React.SyntheticEvent) => { event.preventDefault(); event.stopPropagation(); setOpen(true); };
  return <>
    <span ref={surface} role={!nested && isCmsEditing ? 'button' : undefined} tabIndex={!nested && isCmsEditing ? 0 : undefined} data-cms-translation={textKey} title={t('cms.editText')}
      className="cursor-text outline-dashed outline-1 outline-gold-400/60"
      onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}>{text}</span>
    <TextEditModal open={open} onClose={() => setOpen(false)} page="global" blockKey={`i18n.${textKey}`}
      fallbackText={typeof raw === 'string' ? raw : text} />
  </>;
}
