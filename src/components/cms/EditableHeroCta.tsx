'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';
import { useCms, EDITABLE_LOCALE_TAGS, type LocaleTag } from './CmsProvider';

type CtaLinkType = 'internal' | 'external' | 'phone' | 'email' | 'anchor';
type CtaStyle = 'primary' | 'secondary';

interface CtaConfig {
  link_type: CtaLinkType;
  route: string;
  url: string;
  target: '_self' | '_blank';
  style: CtaStyle;
  enabled: boolean;
}

const LOCALE_LABELS: Record<LocaleTag, string> = {
  'nl-NL': 'NL',
  'en-GB': 'EN',
  'de-DE': 'DE',
  'fr-FR': 'FR',
};

const inputClass =
  'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100';

function parseConfig(value: string, fallbackHref: string, locale: string): CtaConfig {
  try {
    const parsed = JSON.parse(value) as Partial<CtaConfig>;
    if (parsed && typeof parsed === 'object' && parsed.link_type) {
      return {
        link_type: parsed.link_type,
        route: parsed.route ?? '',
        url: parsed.url ?? '',
        target: parsed.target === '_blank' ? '_blank' : '_self',
        style: parsed.style === 'secondary' ? 'secondary' : 'primary',
        enabled: parsed.enabled !== false,
      };
    }
  } catch {
    // Older blocks may contain a plain URL rather than the structured format.
  }
  return configFromHref(fallbackHref, locale);
}

function configFromHref(href: string, locale: string): CtaConfig {
  if (href.startsWith('tel:')) {
    return { link_type: 'phone', route: '', url: href.slice(4), target: '_self', style: 'primary', enabled: true };
  }
  if (href.startsWith('mailto:')) {
    return { link_type: 'email', route: '', url: href.slice(7), target: '_self', style: 'primary', enabled: true };
  }
  if (href.startsWith('#')) {
    return { link_type: 'anchor', route: '', url: href.slice(1), target: '_self', style: 'primary', enabled: true };
  }
  if (/^https?:\/\//i.test(href)) {
    return { link_type: 'external', route: '', url: href, target: '_blank', style: 'primary', enabled: true };
  }
  const route = href.replace(new RegExp(`^/${locale}(?=/)`), '').replace(/^\/+/, '');
  return { link_type: 'internal', route, url: '', target: '_self', style: 'primary', enabled: true };
}

function resolveHref(config: CtaConfig, locale: string): string {
  switch (config.link_type) {
    case 'internal':
      return `/${locale}/${config.route.replace(/^\/+/, '')}`.replace(/\/$/, config.route ? '' : '/');
    case 'phone':
      return `tel:${config.url}`;
    case 'email':
      return `mailto:${config.url}`;
    case 'anchor':
      return `#${config.url.replace(/^#/, '')}`;
    case 'external':
      return config.url;
  }
}

function isValidDestination(config: CtaConfig): boolean {
  if (config.link_type === 'internal') {
    const rawRoute = config.route.trim();
    const route = rawRoute.replace(/^\/+/, '');
    return !rawRoute.startsWith('//') &&
      !route.split('/').includes('..') &&
      !/^https?:/i.test(route);
  }
  if (config.link_type === 'external') {
    try {
      const url = new URL(config.url);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  if (config.link_type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.url);
  if (config.link_type === 'phone') return /^[+0-9().\-\s]+$/.test(config.url) && /\d/.test(config.url);
  return /^[A-Za-z0-9_-]+$/.test(config.url.replace(/^#/, ''));
}

export function EditableHeroCta({
  page,
  blockKey,
  label,
  href,
  variant = 'gold',
  className,
  rightIcon,
  leftIcon,
}: {
  page: string;
  blockKey: string;
  label: string;
  href: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
}) {
  const { t, locale } = useIntl();
  const { push, pushError } = useToast();
  const { canEdit, editMode, localeTag, getText, saveText } = useCms();
  const configKey = `${blockKey}.link`;
  const labelKey = `${blockKey}.label`;
  const config = React.useMemo(
    () => parseConfig(getText(configKey, ''), href, locale),
    [configKey, getText, href, locale],
  );
  const text = getText(labelKey, label);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  const [labels, setLabels] = React.useState<Partial<Record<LocaleTag, string>>>({});
  const [baseLabels, setBaseLabels] = React.useState<Partial<Record<LocaleTag, string>>>({});
  const [draft, setDraft] = React.useState<CtaConfig>(config);
  const editing = canEdit && editMode;
  const destination = resolveHref(config, locale);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setActive(localeTag);
    setDraft(config);
    setLoading(true);
    void Promise.all(EDITABLE_LOCALE_TAGS.map(async (tag) => {
      const response = await cmsService.pageContent(page, tag).catch(() => null) as
        | { content_blocks?: Array<{ key?: string; value?: string }> }
        | null;
      return [tag, response?.content_blocks?.find((block) => block.key === labelKey)?.value ?? ''] as const;
    })).then((entries) => {
      if (cancelled) return;
      const loaded = Object.fromEntries(entries) as Partial<Record<LocaleTag, string>>;
      loaded[localeTag] ||= label;
      setLabels(loaded);
      setBaseLabels(loaded);
    }).catch((error) => {
      if (!cancelled) pushError(error, t('cms.loadError'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, localeTag, config, page, labelKey, label, pushError, t]);

  const onSave = async () => {
    if (draft.enabled && !isValidDestination(draft)) {
      push({ tone: 'error', title: t('cms.invalidCtaLink') });
      return;
    }
    setSaving(true);
    try {
      const changedLabels: Partial<Record<LocaleTag, string>> = {};
      for (const tag of EDITABLE_LOCALE_TAGS) {
        if ((labels[tag] ?? '') !== (baseLabels[tag] ?? '')) changedLabels[tag] = labels[tag] ?? '';
      }
      if (Object.keys(changedLabels).length) {
        await saveText(labelKey, { page, section: 'hero', value_by_locale: changedLabels });
      }
      await saveText(configKey, {
        page,
        section: 'hero',
        type: 'short_text',
        value_by_locale: { [localeTag]: JSON.stringify(draft) },
      });
      push({ tone: 'success', title: t('cms.saved') });
      setOpen(false);
    } catch (error) {
      pushError(error, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const buttonVariant = config.style === 'secondary' ? 'outline' : variant;
  const buttonClassName = className ?? (config.style === 'secondary'
    ? 'border-white/30 bg-white/5 text-white hover:bg-white/10'
    : undefined);

  if (!config.enabled && !editing) return null;
  if (editing) {
    return (
      <>
        <span className="group/cms relative inline-flex items-center gap-1 rounded-lg outline-dashed outline-2 outline-gold-400/70">
          {config.enabled ? (
            <Button
              type="button"
              variant={buttonVariant}
              size="lg"
              className={buttonClassName}
              rightIcon={rightIcon}
              leftIcon={leftIcon}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}
            >
              {text}
            </Button>
          ) : (
            <span className="rounded-lg bg-gold-500 px-4 py-3 text-sm font-semibold text-white">
              {t('cms.disabledCta')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('cms.editCta')}
            title={t('cms.editCta')}
            className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-white opacity-70 shadow transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </span>
        <CtaEditModal
          open={open}
          onClose={() => setOpen(false)}
          labelKey={labelKey}
          labels={labels}
          active={active}
          setActive={setActive}
          onLabelChange={(value) => setLabels((prev) => ({ ...prev, [active]: value }))}
          config={draft}
          setConfig={setDraft}
          loading={loading}
          saving={saving}
          onSave={onSave}
        />
      </>
    );
  }

  const button = (
    <Button
      variant={buttonVariant}
      size="lg"
      className={buttonClassName}
      rightIcon={rightIcon ?? (config.target === '_blank' ? <ArrowUpRight className="h-4 w-4" /> : undefined)}
      leftIcon={leftIcon}
    >
      {text}
    </Button>
  );
  return config.link_type === 'internal' && config.target === '_self' ? (
    <Link href={destination}>{button}</Link>
  ) : (
    <a
      href={destination}
      target={config.target}
      rel={config.target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      {button}
    </a>
  );
}

function CtaEditModal({
  open,
  onClose,
  labels,
  active,
  setActive,
  onLabelChange,
  config,
  setConfig,
  loading,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  labelKey: string;
  labels: Partial<Record<LocaleTag, string>>;
  active: LocaleTag;
  setActive: (tag: LocaleTag) => void;
  onLabelChange: (value: string) => void;
  config: CtaConfig;
  setConfig: React.Dispatch<React.SetStateAction<CtaConfig>>;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { t } = useIntl();
  const set = <K extends keyof CtaConfig>(key: K, value: CtaConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="border-b border-navy-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-navy-900">{t('cms.editCta')}</h2>
        <p className="mt-1 text-sm text-navy-500">{t('cms.ctaDescription')}</p>
      </div>
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex gap-2" role="tablist" aria-label={t('cms.ctaLabel')}>
          {EDITABLE_LOCALE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              role="tab"
              aria-selected={active === tag}
              onClick={() => setActive(tag)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                active === tag ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600'
              }`}
            >
              {LOCALE_LABELS[tag]}
            </button>
          ))}
        </div>
        <label className="block space-y-1 text-sm font-medium text-navy-700">
          {t('cms.ctaLabel')}
          <input className={inputClass} value={labels[active] ?? ''} onChange={(e) => onLabelChange(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-navy-700">
          {t('cms.ctaLinkType')}
          <select
            className={inputClass}
            value={config.link_type}
            onChange={(e) => set('link_type', e.target.value as CtaLinkType)}
          >
            <option value="internal">{t('cms.ctaInternal')}</option>
            <option value="external">{t('cms.ctaExternal')}</option>
            <option value="email">{t('cms.ctaEmail')}</option>
            <option value="phone">{t('cms.ctaPhone')}</option>
            <option value="anchor">{t('cms.ctaAnchor')}</option>
          </select>
        </label>
        {config.link_type === 'internal' ? (
          <label className="block space-y-1 text-sm font-medium text-navy-700">
            {t('cms.ctaRoute')}
            <input
              className={inputClass}
              value={config.route}
              onChange={(e) => set('route', e.target.value)}
              placeholder="contact"
            />
          </label>
        ) : (
          <label className="block space-y-1 text-sm font-medium text-navy-700">
            {config.link_type === 'external' ? t('cms.ctaUrl') : config.link_type === 'phone' ? t('cms.ctaPhone') : config.link_type === 'email' ? t('cms.ctaEmail') : t('cms.ctaAnchor')}
            <input
              className={inputClass}
              value={config.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder={config.link_type === 'email' ? 'info@example.com' : config.link_type === 'phone' ? '+31 475 315661' : config.link_type === 'anchor' ? 'diensten' : 'https://example.com'}
            />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium text-navy-700">
            {t('cms.ctaTarget')}
            <select className={inputClass} value={config.target} onChange={(e) => set('target', e.target.value as CtaConfig['target'])}>
              <option value="_self">{t('cms.ctaSameTab')}</option>
              <option value="_blank">{t('cms.ctaNewTab')}</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium text-navy-700">
            {t('cms.ctaStyle')}
            <select className={inputClass} value={config.style} onChange={(e) => set('style', e.target.value as CtaStyle)}>
              <option value="primary">{t('cms.ctaPrimaryStyle')}</option>
              <option value="secondary">{t('cms.ctaSecondaryStyle')}</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
          <input type="checkbox" checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          {t('cms.ctaEnabled')}
        </label>
        {loading ? <p className="text-xs text-navy-400">{t('cms.loadingLocales')}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-navy-100 px-6 py-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>{t('cms.cancel')}</Button>
        <Button variant="primary" onClick={onSave} disabled={saving || loading}>{t('cms.save')}</Button>
      </div>
    </Modal>
  );
}
