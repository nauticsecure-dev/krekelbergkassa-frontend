'use client';

import * as React from 'react';
import { Languages, Loader2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import { cmsService } from '@/lib/services';
import {
  EDITABLE_LOCALE_TAGS,
  useCms,
  type GlobalValue,
  type LocaleTag,
} from './CmsProvider';

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const TAG_LABEL: Record<LocaleTag, string> = {
  'nl-NL': 'NL',
  'en-GB': 'EN',
  'de-DE': 'DE',
  'fr-FR': 'FR',
};

type ByTag = Partial<Record<LocaleTag, string>>;

/** Language tabs returning the active tag. */
function LocaleTabs({
  active,
  onChange,
}: {
  active: LocaleTag;
  onChange: (tag: LocaleTag) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Locale">
      {EDITABLE_LOCALE_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          role="tab"
          aria-selected={active === tag}
          onClick={() => onChange(tag)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition',
            active === tag
              ? 'bg-navy-900 text-white'
              : 'bg-navy-50 text-navy-600 hover:bg-navy-100',
          )}
        >
          {TAG_LABEL[tag]}
        </button>
      ))}
    </div>
  );
}

const fieldClass =
  'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100';

function ModalHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="border-b border-navy-100 px-6 py-5">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      {desc ? <p className="mt-1 text-sm text-navy-500">{desc}</p> : null}
    </div>
  );
}

/** Footer with cancel + save; disables save while in-flight. */
function ModalFooter({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useIntl();
  return (
    <div className="flex justify-end gap-2 border-t border-navy-100 px-6 py-4">
      <Button variant="ghost" onClick={onCancel} disabled={saving}>
        {t('cms.cancel')}
      </Button>
      <Button
        variant="primary"
        onClick={onSave}
        disabled={saving}
        leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
      >
        {t('cms.save')}
      </Button>
    </div>
  );
}

/** Compute the subset of `draft` that differs from the original `base`. */
function changedByLocale(draft: ByTag, base: ByTag): ByTag {
  const out: ByTag = {};
  for (const tag of EDITABLE_LOCALE_TAGS) {
    const next = draft[tag] ?? '';
    if (next !== (base[tag] ?? '')) out[tag] = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. Text edit modal
// ---------------------------------------------------------------------------

export function TextEditModal({
  open,
  onClose,
  blockKey,
  page,
  section,
  type = 'short_text',
  fallbackText,
}: {
  open: boolean;
  onClose: () => void;
  blockKey: string;
  page: string;
  section?: string;
  type?: string;
  fallbackText: string;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { saveText, getContentBlock, localeTag } = useCms();

  const [active, setActive]           = React.useState<LocaleTag>(localeTag);
  const [values, setValues]           = React.useState<ByTag>({});
  const [base, setBase]               = React.useState<ByTag>({});
  const [saving, setSaving]           = React.useState(false);
  const [autoTranslate, setAutoTranslate] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const stored = getContentBlock(blockKey)?.value ?? '';
    const seeded: ByTag = { [localeTag]: stored || fallbackText };
    setValues(seeded);
    setBase(seeded);
    setActive(localeTag);
    setAutoTranslate(false);
  }, [open, blockKey, fallbackText, localeTag, getContentBlock]);

  const isLong = type === 'rich_text' || type === 'long_text';

  // All locale tabs except the one currently being edited
  const otherLocales = EDITABLE_LOCALE_TAGS.filter((tag) => tag !== active);

  const onSave = async () => {
    let currentValues = { ...values };

    // Auto-translate: send the active locale text to all other locales
    if (autoTranslate && currentValues[active]?.trim()) {
      setTranslating(true);
      try {
        const res = await cmsService.translate({
          text: currentValues[active]!,
          source_locale: active,
          target_locales: otherLocales,
        });
        // Merge translated values — don't overwrite locales the editor already filled in
        for (const [locale, translated] of Object.entries(res.translations)) {
          const tag = locale as LocaleTag;
          if (!currentValues[tag]?.trim()) {
            currentValues = { ...currentValues, [tag]: translated };
          }
        }
        setValues(currentValues);
        push({ tone: 'success', title: 'Vertaling gegenereerd' });
      } catch {
        push({ tone: 'info', title: 'Vertaling mislukt — tekst opgeslagen zonder vertaling' });
      } finally {
        setTranslating(false);
      }
    }

    const value_by_locale = changedByLocale(currentValues, base);
    if (Object.keys(value_by_locale).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await saveText(blockKey, { page, section, type, value_by_locale });
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || translating;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={t('cms.editText')} desc={blockKey} />
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <LocaleTabs active={active} onChange={setActive} />
        <textarea
          key={active}
          value={values[active] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [active]: e.target.value }))}
          rows={isLong ? 8 : 3}
          className={fieldClass}
          placeholder={t('cms.textPlaceholder')}
          aria-label={`${t('cms.editText')} ${TAG_LABEL[active]}`}
        />

        {/* Auto-translate checkbox */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-navy-100 bg-navy-50 px-3 py-2.5 text-sm text-navy-700 transition hover:bg-navy-100">
          <input
            type="checkbox"
            checked={autoTranslate}
            onChange={(e) => setAutoTranslate(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-navy-900"
          />
          <Languages className="h-4 w-4 shrink-0 text-navy-500" />
          <span>
            Automatisch vertalen naar{' '}
            <strong>{otherLocales.map((l) => TAG_LABEL[l]).join(', ')}</strong> via AI
          </span>
          {autoTranslate && (
            <span className="ml-auto rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
              AI
            </span>
          )}
        </label>

        <p className="text-xs text-navy-400">{t('cms.localeHint')}</p>
      </div>

      {/* Footer — shows spinner while translating */}
      <div className="flex justify-end gap-2 border-t border-navy-100 px-6 py-4">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t('cms.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={busy}
          leftIcon={
            busy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
          }
        >
          {translating ? 'Vertalen…' : t('cms.save')}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 2. Image edit modal
// ---------------------------------------------------------------------------

export function ImageEditModal({
  open,
  onClose,
  blockKey,
  fallbackSrc,
}: {
  open: boolean;
  onClose: () => void;
  blockKey: string;
  /**
   * Page slug — accepted for call-site symmetry with TextEditModal. Media saves
   * are key-addressed so the slug is not part of the upsert payload.
   */
  page?: string;
  fallbackSrc: string;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { getMedia, uploadImage, saveMediaMeta, localeTag } = useCms();

  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  const [altValues, setAltValues] = React.useState<ByTag>({});
  const [altBase, setAltBase] = React.useState<ByTag>({});
  const [previewSrc, setPreviewSrc] = React.useState(fallbackSrc);
  const [focal, setFocal] = React.useState({ x: 50, y: 50 });
  const [overlay, setOverlay] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const block = getMedia(blockKey);
    const seededAlt: ByTag = { [localeTag]: block?.alt ?? '' };
    setAltValues(seededAlt);
    setAltBase(seededAlt);
    setPreviewSrc(block?.image_url || fallbackSrc);
    setFocal(block?.focal_point ?? { x: 50, y: 50 });
    setOverlay(block?.overlay ?? 0);
    setActive(localeTag);
  }, [open, blockKey, fallbackSrc, localeTag, getMedia]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(blockKey, file);
      if (url) setPreviewSrc(url);
      push({ tone: 'success', title: t('cms.imageUploaded') });
    } catch (err) {
      pushError(err, t('cms.uploadError'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Click anywhere on the preview to set the focal point (0..100 each axis).
  const onPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setFocal({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const alt_by_locale = changedByLocale(altValues, altBase);
      await saveMediaMeta(blockKey, {
        alt_by_locale: Object.keys(alt_by_locale).length ? alt_by_locale : undefined,
        focal_x: focal.x,
        focal_y: focal.y,
        overlay,
      });
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={t('cms.editImage')} desc={blockKey} />
      <div className="space-y-5 overflow-y-auto px-6 py-5">
        {/* Focal-point picker */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy-500">
              {t('cms.focalPoint')}
            </span>
            <span className="text-xs text-navy-400">
              x {focal.x} · y {focal.y}
            </span>
          </div>
          <div
            onClick={onPreviewClick}
            className="relative aspect-[16/9] w-full cursor-crosshair overflow-hidden rounded-lg bg-navy-100"
            role="presentation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
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
            <span
              aria-hidden
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500 shadow"
              style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-navy-400">{t('cms.focalHint')}</p>
        </div>

        {/* Upload */}
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 hover:bg-navy-50">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t('cms.uploadImage')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Overlay slider */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.overlay')}
            <span className="font-normal normal-case text-navy-400">
              {overlay.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={overlay}
            onChange={(e) => setOverlay(Number(e.target.value))}
            className="w-full accent-gold-500"
            aria-label={t('cms.overlay')}
          />
        </div>

        {/* Alt text (per locale) */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.altText')}
          </label>
          <div className="mb-2">
            <LocaleTabs active={active} onChange={setActive} />
          </div>
          <input
            key={active}
            type="text"
            value={altValues[active] ?? ''}
            onChange={(e) => setAltValues((v) => ({ ...v, [active]: e.target.value }))}
            className={fieldClass}
            placeholder={t('cms.altPlaceholder')}
            aria-label={`${t('cms.altText')} ${TAG_LABEL[active]}`}
          />
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving || uploading} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 3. SEO edit modal
// ---------------------------------------------------------------------------

const ROBOTS_OPTIONS = ['index,follow', 'noindex,nofollow'] as const;

export function SeoEditModal({
  open,
  onClose,
  pageSlug,
}: {
  open: boolean;
  onClose: () => void;
  pageSlug: string | null;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { getSeo, saveSeo, localeTag } = useCms();

  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  const [titles, setTitles] = React.useState<ByTag>({});
  const [titleBase, setTitleBase] = React.useState<ByTag>({});
  const [descs, setDescs] = React.useState<ByTag>({});
  const [descBase, setDescBase] = React.useState<ByTag>({});
  const [robots, setRobots] = React.useState<string>('index,follow');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const seo = getSeo();
    const seedTitle: ByTag = { [localeTag]: seo?.title ?? '' };
    const seedDesc: ByTag = { [localeTag]: seo?.description ?? '' };
    setTitles(seedTitle);
    setTitleBase(seedTitle);
    setDescs(seedDesc);
    setDescBase(seedDesc);
    setRobots(seo?.robots ?? 'index,follow');
    setActive(localeTag);
  }, [open, localeTag, getSeo]);

  const onSave = async () => {
    if (!pageSlug) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const title_by_locale = changedByLocale(titles, titleBase);
      const description_by_locale = changedByLocale(descs, descBase);
      await saveSeo(pageSlug, {
        title_by_locale: Object.keys(title_by_locale).length ? title_by_locale : undefined,
        description_by_locale: Object.keys(description_by_locale).length
          ? description_by_locale
          : undefined,
        robots,
      });
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={t('cms.seoTitle')} desc={pageSlug ?? t('cms.noPage')} />
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <LocaleTabs active={active} onChange={setActive} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.metaTitle')}
          </label>
          <input
            key={`title-${active}`}
            type="text"
            value={titles[active] ?? ''}
            onChange={(e) => setTitles((v) => ({ ...v, [active]: e.target.value }))}
            className={fieldClass}
            aria-label={`${t('cms.metaTitle')} ${TAG_LABEL[active]}`}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.metaDescription')}
          </label>
          <textarea
            key={`desc-${active}`}
            value={descs[active] ?? ''}
            onChange={(e) => setDescs((v) => ({ ...v, [active]: e.target.value }))}
            rows={3}
            className={fieldClass}
            aria-label={`${t('cms.metaDescription')} ${TAG_LABEL[active]}`}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.robots')}
          </label>
          <select
            value={robots}
            onChange={(e) => setRobots(e.target.value)}
            className={fieldClass}
            aria-label={t('cms.robots')}
          >
            {ROBOTS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        {!pageSlug ? (
          <p className="text-xs text-rose-500">{t('cms.noPageHint')}</p>
        ) : null}
      </div>
      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 4. Global settings modal
// ---------------------------------------------------------------------------

interface GlobalKeyDef {
  key: string;
  /** When true the value is a per-locale map; otherwise a plain string. */
  perLocale?: boolean;
  labelKey: string;
}

const GLOBAL_KEYS: GlobalKeyDef[] = [
  { key: 'company.phone', labelKey: 'cms.global.phone' },
  { key: 'company.address.city', labelKey: 'cms.global.city' },
  { key: 'footer.tagline', perLocale: true, labelKey: 'cms.global.tagline' },
  { key: 'social.facebook_url', labelKey: 'cms.global.facebook' },
  { key: 'social.instagram_url', labelKey: 'cms.global.instagram' },
];

export function GlobalSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { getGlobalRaw, saveGlobal, localeTag } = useCms();

  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  // Plain string values, keyed by global key.
  const [strings, setStrings] = React.useState<Record<string, string>>({});
  // Per-locale values, keyed by global key then locale tag.
  const [maps, setMaps] = React.useState<Record<string, ByTag>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const nextStrings: Record<string, string> = {};
    const nextMaps: Record<string, ByTag> = {};
    for (const def of GLOBAL_KEYS) {
      const raw = getGlobalRaw(def.key);
      if (def.perLocale) {
        nextMaps[def.key] = typeof raw === 'object' && raw ? { ...raw } : {};
      } else {
        nextStrings[def.key] = typeof raw === 'string' ? raw : '';
      }
    }
    setStrings(nextStrings);
    setMaps(nextMaps);
    setActive(localeTag);
  }, [open, localeTag, getGlobalRaw]);

  const onSave = async () => {
    setSaving(true);
    try {
      for (const def of GLOBAL_KEYS) {
        const value: GlobalValue = def.perLocale
          ? (maps[def.key] ?? {})
          : (strings[def.key] ?? '');
        await saveGlobal(def.key, value);
      }
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={t('cms.globalTitle')} desc={t('cms.globalDesc')} />
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        {GLOBAL_KEYS.map((def) => (
          <div key={def.key}>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-navy-500">
              {t(def.labelKey)}
              {def.perLocale ? (
                <span className="font-normal normal-case text-navy-400">
                  {TAG_LABEL[active]}
                </span>
              ) : null}
            </label>
            {def.perLocale ? (
              <>
                <div className="mb-2">
                  <LocaleTabs active={active} onChange={setActive} />
                </div>
                <input
                  key={`${def.key}-${active}`}
                  type="text"
                  value={maps[def.key]?.[active] ?? ''}
                  onChange={(e) =>
                    setMaps((m) => ({
                      ...m,
                      [def.key]: { ...m[def.key], [active]: e.target.value },
                    }))
                  }
                  className={fieldClass}
                  aria-label={`${t(def.labelKey)} ${TAG_LABEL[active]}`}
                />
              </>
            ) : (
              <input
                type="text"
                value={strings[def.key] ?? ''}
                onChange={(e) =>
                  setStrings((s) => ({ ...s, [def.key]: e.target.value }))
                }
                className={fieldClass}
                aria-label={t(def.labelKey)}
              />
            )}
          </div>
        ))}
      </div>
      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving} />
    </Modal>
  );
}
