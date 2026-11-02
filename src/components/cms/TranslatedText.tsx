'use client';
import * as React from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen } from './CmsProvider';
import { TextEditModal } from './CmsModals';

/** A text-only trigger remains valid inside links, buttons and headings. */
export function TranslatedText({ textKey, vars, fallbackText, inline = true }: {
  textKey: string; vars?: Record<string, string | number | undefined>; fallbackText?: string; inline?: boolean;
}) {
  const { t, messages } = useIntl();
  const { isCmsEditing, retainCmsDrafts, localeTag } = useCms();
  const [open, setOpen] = useCmsEditorOpen();
  const surface = React.useRef<HTMLSpanElement>(null);
  const [nested, setNested] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!isCmsEditing || !inline) return;
    const parent = surface.current?.parentElement?.closest('a, button, [role="button"], [role="link"]');
    setNested(!!parent);
    if (!parent) return;
    // Let the existing link/button act as the editor trigger. There must be no
    // second interactive control inside it, and padding/icons must not navigate.
    const activate = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target instanceof Element ? event.target.closest('[data-cms-translation]') : null;
      if (target && target !== surface.current) return;
      if (!target && parent.querySelector('[data-cms-translation]') !== surface.current) return;
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
  }, [isCmsEditing, inline, setOpen]);
  const text = t(textKey, fallbackText === undefined ? vars : { defaultValue: fallbackText, ...vars });
  if (!inline || (!isCmsEditing && !retainCmsDrafts)) return <>{text}</>;
  const raw = textKey.split('.').reduce<unknown>((value, key) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, messages);
  const activate = (event: React.SyntheticEvent) => { event.preventDefault(); event.stopPropagation(); setOpen(true); };
  return <>
    <span ref={surface} role={!nested && isCmsEditing ? 'button' : undefined} tabIndex={!nested && isCmsEditing ? 0 : undefined} data-cms-translation={textKey} data-cms-key={`i18n.${textKey}`} data-cms-locale={localeTag} data-cms-source="i18n" title={t('cms.editText')}
      className="cursor-text outline-dashed outline-1 outline-gold-400/60"
      onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}>{text}</span>
    <TextEditModal open={open} onClose={() => setOpen(false)} page="global" blockKey={`i18n.${textKey}`}
      fallbackText={typeof raw === 'string' ? raw : text} />
  </>;
}
