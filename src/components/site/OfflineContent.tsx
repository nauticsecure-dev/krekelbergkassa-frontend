'use client';
import * as React from 'react';
import Link from 'next/link';
import { offline as nl } from '@/i18n/messages/nl.json';
import { offline as en } from '@/i18n/messages/en.json';
import { offline as de } from '@/i18n/messages/de.json';
import { offline as fr } from '@/i18n/messages/fr.json';

const defaults = { nl, en, de, fr };
type Locale = keyof typeof defaults;
type CachedBlock = { key: string; value: string; source?: { record_id?: string; version?: string } };

/** The offline shell reads only the already-published public CMS cache. */
export function OfflineContent() {
  const [locale, setLocale] = React.useState<Locale>('nl');
  const [blocks, setBlocks] = React.useState<CachedBlock[]>([]);
  React.useEffect(() => {
    const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('krek_locale='));
    const language = cookie?.split('=')[1] ?? 'nl';
    const selected: Locale = Object.hasOwn(defaults, language) ? language as Locale : 'nl';
    setLocale(selected);
    try {
      const tag = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[selected];
      const cached = JSON.parse(sessionStorage.getItem(`cms:page:global:${tag}`) ?? 'null');
      if (Array.isArray(cached?.content_blocks)) setBlocks(cached.content_blocks);
    } catch { /* The static translated fallback remains available offline. */ }
  }, []);
  const text = (field: keyof typeof nl) => {
    const key = `i18n.offline.${field}`;
    const block = blocks.find(item => item.key === key);
    return <span data-cms-key={key} data-cms-field-id={`content_block.${key}`} data-cms-locale={locale}
      data-cms-source="content_block" data-cms-publication="published" data-cms-record-id={block?.source?.record_id ?? 'uncreated'}
      data-cms-version={block?.source?.version ?? 'uncreated'}>{block?.value ?? defaults[locale][field]}</span>;
  };
  return <main lang={locale} className="flex min-h-screen items-center justify-center bg-sand-50 p-6">
    <div className="max-w-md text-center">
      <div aria-hidden className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-sand-100">⚓</div>
      <h1 className="font-display text-3xl text-navy-900">{text('title')}</h1>
      <p className="mt-2 text-sm text-navy-500">{text('body')}</p>
      <Link href={`/${locale}`} className="mt-6 inline-flex rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white">{text('retry')}</Link>
    </div>
  </main>;
}
