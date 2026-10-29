'use client';
import { CTA_ROUTES } from './cta-routes';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Languages, Loader2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import { cmsService } from '@/lib/services';
import { saveTextDraft } from './text-save';
import { normalizeHeaderDestination } from './header-destination';
import {
  EDITABLE_LOCALE_TAGS,
  initialEditorLocale,
  useCms,
  type GlobalValue,
  type LocaleTag,
  type ImageStyle,
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
  const { editorLocales } = useCms();
  React.useEffect(() => { if (editorLocales.length && !editorLocales.includes(active)) onChange(editorLocales[0]); }, [active, editorLocales, onChange]);
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Locale">
      {editorLocales.map((tag) => (
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
  const { saveText, getContentBlock, localeTag, editorLocales } = useCms();

  const [active, setActive]           = React.useState<LocaleTag>(localeTag);
  const [values, setValues]           = React.useState<ByTag>({});
  const [base, setBase]               = React.useState<ByTag>({});
  const [saving, setSaving]           = React.useState(false);
  const [autoTranslate, setAutoTranslate] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [loadingLocales, setLoadingLocales] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!open) return;
    const stored = getContentBlock(blockKey)?.value ?? '';
    const seeded: ByTag = { [localeTag]: stored || fallbackText };
    setValues(seeded);
    setBase(seeded);
    setActive(initialEditorLocale(localeTag, editorLocales));
    setAutoTranslate(false);
    let cancelled = false;
    setLoadingLocales(true);
    void Promise.all(editorLocales.map(async (tag) => {
      const response = await cmsService.pageContent(page, tag) as { content_blocks?: Array<{ key: string; value: string }> };
      return [tag, response.content_blocks?.find((block) => block.key === blockKey)?.value ?? seeded[tag] ?? ''] as const;
    })).then((entries) => {
      if (cancelled) return;
      const loaded = Object.fromEntries(entries);
      setValues(loaded); setBase(loaded);
    }).catch((error) => { if (!cancelled) pushError(error, t('cms.loadError')); })
      .finally(() => { if (!cancelled) setLoadingLocales(false); });
    return () => { cancelled = true; };
    // Seed once per opening rather than resetting the draft on a CMS update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockKey, page, localeTag]);

  const isLong = type === 'rich_text' || type === 'long_text';

  // All locale tabs except the one currently being edited
  const otherLocales = editorLocales.filter((tag) => tag !== active);

  const onSave = async () => {
    if (saving || translating) return;
    setSaving(true);
    try {
      const outcome = await saveTextDraft({
        values, base, source: active, locales: editorLocales, autoTranslate,
        translate: async (payload) => {
          setTranslating(true);
          try { return await cmsService.translate(payload); }
          finally { setTranslating(false); }
        },
        save: (value_by_locale) => saveText(blockKey, { page, section, type, value_by_locale }),
        onTranslated: setValues,
      });
      if (outcome !== 'unchanged') {
        push({
          tone: outcome.startsWith('translationFailed') ? 'info' : 'success',
          title: t(outcome === 'translated' ? 'cms.savedWithTranslations'
            : outcome === 'translationFailed' ? 'cms.savedWithoutTranslations'
            : outcome === 'translationFailedUnchanged' ? 'cms.translationFailed' : 'cms.saved'),
        });
      }
      if (outcome !== 'translationFailedUnchanged') onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const submitting = saving || translating;
  const busy = submitting || loadingLocales;

  return (
    <Modal open={open} onClose={() => { if (!submitting) onClose(); }} size="lg">
      <ModalHeader title={t('cms.editText')} desc={blockKey} />
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <LocaleTabs active={active} onChange={(tag) => { if (!busy) setActive(tag); }} />
        <textarea
          key={active}
          disabled={busy}
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
            disabled={busy}
            onChange={(e) => setAutoTranslate(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-navy-900"
          />
          <Languages className="h-4 w-4 shrink-0 text-navy-500" />
          <span>
            {t('cms.autoTranslate', { languages: otherLocales.map((l) => TAG_LABEL[l]).join(', ') })}
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
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
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
          {translating ? t('cms.translating') : t('cms.save')}
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
  page,
  fallbackSrc,
  aspect = 16 / 9,
  defaultStyle,
}: {
  open: boolean;
  onClose: () => void;
  blockKey: string;
  /** Page slug stored on the media block so public page-content can load it. */
  page?: string;
  fallbackSrc: string;
  /** Cropper aspect ratio (width/height). Defaults to 16/9 for hero images. */
  aspect?: number;
  defaultStyle?: ImageStyle;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { getMedia, uploadImage, saveMediaMeta, localeTag, currentPage, editorLocales, guardCms } = useCms();
  const resolvedPage = page || currentPage || undefined;

  const [active, setActive] = React.useState<LocaleTag>(localeTag);
  const [altValues, setAltValues] = React.useState<ByTag>({});
  const [altBase, setAltBase] = React.useState<ByTag>({});
  const [seoTitleValues, setSeoTitleValues] = React.useState<ByTag>({});
  const [seoTitleBase, setSeoTitleBase] = React.useState<ByTag>({});
  const [previewSrc, setPreviewSrc] = React.useState(fallbackSrc);
  const [focal, setFocal] = React.useState({ x: 50, y: 50 });
  const [imageStyle, setImageStyle] = React.useState<ImageStyle>({});
  const [mobileFocal, setMobileFocal] = React.useState({ x: 50, y: 50 });
  const [pendingMobileFile, setPendingMobileFile] = React.useState<File | null>(null);
  const [mobileFileId, setMobileFileId] = React.useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = React.useState<string | undefined>();
  const [library, setLibrary] = React.useState<Array<{id: string; filename: string; url: string; usage: Array<{key: string; page: string}>}>>([]);
  const [overlay, setOverlay] = React.useState(0);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
  const [croppedArea, setCroppedArea] = React.useState<Area | null>(null);
  const [initialCrop, setInitialCrop] = React.useState<Area | undefined>();
  const [initialPixels, setInitialPixels] = React.useState<Area | undefined>();
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [loadingMeta, setLoadingMeta] = React.useState(false);
  const previewUrl = React.useRef<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const block = getMedia(blockKey);
    const seededAlt: ByTag = { [localeTag]: block?.alt ?? '' };
    const seededSeoTitle: ByTag = { [localeTag]: block?.seo_title ?? '' };
    setAltValues(seededAlt);
    setAltBase(seededAlt);
    setSeoTitleValues(seededSeoTitle);
    setSeoTitleBase(seededSeoTitle);
    setPreviewSrc(block?.image_url || fallbackSrc);
    setFocal(block?.focal_point ?? { x: 50, y: 50 });
    setOverlay(block?.overlay ?? 0);
    setImageStyle({ ...defaultStyle, ...block?.image_style });
    setMobileFocal(block?.mobile_focal_point ?? {x:50,y:50});
    setMobileFileId(block?.mobile_file_id ?? null);
    setSelectedFileId(undefined);
    void cmsService.mediaLibrary().then(r => setLibrary(r.data)).catch(error => pushError(error, t('cms.loadError')));
    setPendingFile(null);
    setPendingMobileFile(null);
    setInitialCrop(block?.crop_data?.unit === 'percent' ? block.crop_data : undefined);
    setInitialPixels(block?.crop_data && block.crop_data.unit !== 'percent' ? block.crop_data : undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCroppedArea(null);
    setActive(initialEditorLocale(localeTag, editorLocales));
    // Seed on opening; provider updates during Save must not reset the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockKey, fallbackSrc, localeTag]);

  React.useEffect(() => {
    if (!open || !resolvedPage) return;
    let cancelled = false;
    setLoadingMeta(true);
    void Promise.all(editorLocales.map(async (tag) => {
      const response = await cmsService.pageContent(resolvedPage, tag) as {
        media_blocks?: Array<{ key: string; alt?: string; seo_title?: string }>;
      };
      return { tag, block: response.media_blocks?.find((item) => item.key === blockKey) };
    })).then((entries) => {
      if (cancelled) return;
      const alts = Object.fromEntries(entries.map(({ tag, block }) => [tag, block?.alt ?? '']));
      const titles = Object.fromEntries(entries.map(({ tag, block }) => [tag, block?.seo_title ?? '']));
      setAltValues(alts);
      setAltBase(alts);
      setSeoTitleValues(titles);
      setSeoTitleBase(titles);
    }).catch((error) => {
      if (!cancelled) pushError(error, t('cms.loadError'));
    }).finally(() => {
      if (!cancelled) setLoadingMeta(false);
    });
    return () => { cancelled = true; };
    // The draft belongs to this modal opening, not subsequent provider updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockKey, resolvedPage, localeTag]);

  React.useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);
  React.useEffect(() => {
    if (!open && previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
      setPendingFile(null);
    }
  }, [open]);

  const validateImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      push({ tone: 'error', title: t('cms.uploadError'), message: t('cms.imageFormats') });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      push({ tone: 'error', title: t('cms.uploadError'), message: t('cms.imageSizeLimit') });
      return false;
    }
    return true;
  };

  const uploadFile = async (file?: File) => {
    if (!file || !validateImage(file)) return;
    if (saving) return;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(file);
    setPendingFile(file);
    setSelectedFileId(undefined);
    setPreviewSrc(previewUrl.current);
    setInitialCrop(undefined);
    setInitialPixels(undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCroppedAreaPixels(null);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await uploadFile(event.dataTransfer.files?.[0]);
  };

  const onSave = async () => {
    if (saving || loadingMeta) return;
    setSaving(true);
    try {
      if (pendingFile) {
        setUploading(true);
        await uploadImage(blockKey, pendingFile, resolvedPage);
        setPendingFile(null);
        setUploading(false);
      }
      let savedMobileFileId = mobileFileId;
      if (pendingMobileFile) {
        const data = new FormData(); data.append('image', pendingMobileFile); data.append('page', resolvedPage ?? ''); data.append('variant', 'mobile');
        const result = await guardCms(() => cmsService.uploadMediaBlock(blockKey, data)) as {mobile_file_id: string};
        savedMobileFileId = result.mobile_file_id; setMobileFileId(savedMobileFileId); setPendingMobileFile(null);
      }
      const alt_by_locale = changedByLocale(altValues, altBase);
      const seo_title_by_locale = changedByLocale(seoTitleValues, seoTitleBase);
      await saveMediaMeta(blockKey, {
        page: resolvedPage,
        file_id: selectedFileId,
        mobile_file_id: savedMobileFileId,
        mobile_focal_point: mobileFocal,
        image_style: imageStyle,
        alt_by_locale: Object.keys(alt_by_locale).length ? alt_by_locale : undefined,
        seo_title_by_locale: Object.keys(seo_title_by_locale).length ? seo_title_by_locale : undefined,
        focal_x: focal.x,
        focal_y: focal.y,
        overlay,
        crop_data: croppedArea
          ? { ...croppedArea, unit: 'percent' }
          : croppedAreaPixels
          ? {
              x: croppedAreaPixels.x,
              y: croppedAreaPixels.y,
              width: croppedAreaPixels.width,
              height: croppedAreaPixels.height,
            }
          : undefined,
      });
      push({ tone: 'success', title: t('cms.saved') });
      onClose();
    } catch (err) {
      pushError(err, t('cms.saveError'));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose(); }} size="lg">
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
            className="relative w-full overflow-hidden rounded-lg bg-navy-950"
            style={{ aspectRatio: String(aspect) }}
          >
            <Cropper
              key={previewSrc}
              image={previewSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              initialCroppedAreaPercentages={initialCrop}
              initialCroppedAreaPixels={initialPixels}
              onCropComplete={(area, pixels) => { setCroppedArea(area); setCroppedAreaPixels(pixels); }}
            />
          </div>
          <label className="mt-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.zoom')}
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-gold-500"
              aria-label={t('cms.zoom')}
            />
          </label>
          <p className="mt-1.5 text-xs text-navy-400">{t('cms.focalHint')}</p>
        </div>

        {/* Upload */}
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void onDrop(event)}
          className="rounded-xl border border-dashed border-navy-200 p-4"
        >
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 hover:bg-navy-50">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t('cms.uploadImage')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onFileChange}
              disabled={uploading}
            />
          </label>
          <p className="mt-2 text-xs text-navy-400">{t('cms.imageDropHint')} {t('cms.imageSizeLimit')}</p>
        </div>

        <fieldset disabled={saving} className="space-y-3">
          <legend className="text-sm font-semibold">{t('cms.mediaLibrary')}</legend>
          <SearchSelect className={fieldClass} aria-label={t('cms.existingImage')} value={selectedFileId ?? ''} onChange={e => {
            const file = library.find(file => file.id === e.target.value);
            if (!file) {
              const block = getMedia(blockKey);
              setSelectedFileId(undefined); setPreviewSrc(block?.image_url || fallbackSrc); setPendingFile(null);
              setInitialCrop(block?.crop_data?.unit === 'percent' ? block.crop_data : undefined);
              setInitialPixels(block?.crop_data && block.crop_data.unit !== 'percent' ? block.crop_data : undefined);
              setCrop({x:0,y:0}); setZoom(1); setCroppedArea(null); setCroppedAreaPixels(null);
              return;
            }
            setSelectedFileId(file.id); setPreviewSrc(file.url); setPendingFile(null);
            setInitialCrop(undefined); setInitialPixels(undefined); setCrop({x:0,y:0}); setZoom(1);
          }}>
            <option value="">{t('cms.keepCurrentImage')}</option>
            {library.map(file => <option key={file.id} value={file.id}>{file.filename} ({file.usage.length})</option>)}
          </SearchSelect>
          {selectedFileId && <p className="text-xs">{library.find(f => f.id === selectedFileId)?.usage.map(u => u.page || u.key).join(', ') || t('cms.unusedImage')}</p>}
          {selectedFileId && library.find(f => f.id === selectedFileId)?.usage.length === 0 && <Button variant="ghost" onClick={async () => {
            try { await cmsService.deleteLibraryMedia(selectedFileId); setLibrary(items => items.filter(f => f.id !== selectedFileId)); setSelectedFileId(undefined); setPreviewSrc(getMedia(blockKey)?.image_url || fallbackSrc); }
            catch(error) { pushError(error, t('cms.saveError')); }
          }}>{t('cms.deleteUnusedImage')}</Button>}
          <label className="block text-sm">{t('cms.mobileImage')}
            <SearchSelect className={fieldClass} value={mobileFileId ?? ''} onChange={e => { setMobileFileId(e.target.value || null); setPendingMobileFile(null); }}>
              <option value="">{t('cms.useDesktopImage')}</option>
              {library.map(file => <option key={file.id} value={file.id}>{file.filename}</option>)}
            </SearchSelect>
          </label>
          <label className="block text-sm">{t('cms.uploadMobileImage')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || uploading} onChange={e => {
            const file = e.target.files?.[0];
            if (file && validateImage(file)) setPendingMobileFile(file);
            e.target.value = '';
          }} /></label>
          {(['x','y'] as const).map(axis => {
            const label = t('cms.desktopFocal', { axis });
            return <label key={axis} className="block text-sm">{label}: {focal[axis]}
              <input aria-label={label} className="w-full" type="range" min="0" max="100" value={focal[axis]} onChange={e => setFocal(v => ({...v,[axis]:Number(e.target.value)}))} />
            </label>;
          })}
          {(['x','y'] as const).map(axis => {
            const label = t('cms.mobileFocal', { axis });
            return <label key={axis} className="block text-sm">{label}: {mobileFocal[axis]}
              <input aria-label={label} className="w-full" type="range" min="0" max="100" value={mobileFocal[axis]} onChange={e => setMobileFocal(v => ({...v,[axis]:Number(e.target.value)}))} />
            </label>;
          })}
          {([
            ['brightness', 'cms.brightness'],
            ['contrast', 'cms.contrast'],
            ['saturation', 'cms.saturation'],
          ] as const).map(([field, labelKey]) => <label key={field} className="block text-sm">{t(labelKey)}: {imageStyle[field] ?? 100}%
            <input aria-label={t(labelKey)} className="w-full" type="range" min="0" max="200" value={imageStyle[field] ?? 100} onChange={e => setImageStyle(v => ({...v,[field]:Number(e.target.value)}))} />
          </label>)}
          <label className="block text-sm">{t('cms.alignment')}<SearchSelect className={fieldClass} value={imageStyle.alignment ?? 'center'} onChange={e => setImageStyle(v => ({...v, alignment:e.target.value as ImageStyle['alignment']}))}>
            <option value="left">{t('cms.alignLeft')}</option>
            <option value="center">{t('cms.alignCenter')}</option>
            <option value="right">{t('cms.alignRight')}</option>
          </SearchSelect></label>
          <label className="block text-sm">{t('cms.gradient')}<SearchSelect className={fieldClass} value={imageStyle.gradient ?? 'none'} onChange={e => setImageStyle(v => ({...v, gradient:e.target.value as ImageStyle['gradient']}))}>
            <option value="none">{t('cms.gradientNone')}</option>
            <option value="right">{t('cms.gradientRight')}</option>
            <option value="bottom">{t('cms.gradientBottom')}</option>
          </SearchSelect></label>
          {([
            ['gradient_start', 'cms.gradientStart'],
            ['gradient_middle', 'cms.gradientMiddle'],
            ['gradient_end', 'cms.gradientEnd'],
          ] as const).map(([field, labelKey]) => <label key={field} className="block text-sm">{t(labelKey)}
            <input aria-label={t(labelKey)} className="w-full" type="range" min="0" max="1" step=".05" value={imageStyle[field] ?? 0} onChange={e => setImageStyle(v => ({...v,[field]:Number(e.target.value)}))} />
          </label>)}
        </fieldset>
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
            disabled={loadingMeta || saving}
            onChange={(e) => setAltValues((v) => ({ ...v, [active]: e.target.value }))}
            className={fieldClass}
            placeholder={t('cms.altPlaceholder')}
            aria-label={`${t('cms.altText')} ${TAG_LABEL[active]}`}
          />
          <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('cms.imageSeoTitle')}
          </label>
          <input
            key={`seo-${active}`}
            type="text"
            value={seoTitleValues[active] ?? ''}
            disabled={loadingMeta || saving}
            onChange={(e) => setSeoTitleValues((v) => ({ ...v, [active]: e.target.value }))}
            className={fieldClass}
            placeholder={t('cms.imageSeoTitle')}
            aria-label={`${t('cms.imageSeoTitle')} ${TAG_LABEL[active]}`}
          />
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={onSave} saving={saving || uploading || loadingMeta} />
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
  const { getSeo, saveSeo, localeTag, editorLocales } = useCms();

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
    setActive(initialEditorLocale(localeTag, editorLocales));
  }, [open, localeTag, getSeo, editorLocales]);

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
          <SearchSelect
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
          </SearchSelect>
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
  placeholder?: string;
}

const GLOBAL_KEYS: GlobalKeyDef[] = [
  { key: 'header.cta.label', perLocale: true, labelKey: 'cms.global.headerCtaLabel' },
  { key: 'header.cta.path', labelKey: 'cms.global.headerCtaPath', placeholder: 'diensten/winterstalling' },
  { key: 'company.phone', labelKey: 'cms.global.phone' },
  { key: 'company.address.city', labelKey: 'cms.global.city' },
  { key: 'footer.tagline', perLocale: true, labelKey: 'cms.global.tagline' },
  { key: 'social.facebook_url', labelKey: 'cms.global.facebook' },
  { key: 'social.instagram_url', labelKey: 'cms.global.instagram' },
];

export function GlobalSettingsModal({
  open,
  onClose,
  headerOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  headerOnly?: boolean;
}) {
  const { t } = useIntl();
  const { push, pushError } = useToast();
  const { getGlobalRaw, saveGlobal, localeTag, editorLocales } = useCms();

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
        nextMaps[def.key] = typeof raw === 'object' && raw ? { ...raw } :
          Object.fromEntries(editorLocales.map((tag) => [tag, typeof raw === 'string' ? raw : def.key === 'header.cta.label' ? 'Stalling' : '']));
      } else {
        nextStrings[def.key] =
          typeof raw === 'string' && (raw !== '' || def.key === 'header.cta.path')
            ? raw
            : (def.placeholder ?? '');
      }
    }
    setStrings(nextStrings);
    setMaps(nextMaps);
    setActive(initialEditorLocale(localeTag, editorLocales));
  }, [open, localeTag, getGlobalRaw, editorLocales]);

  const onSave = async () => {
    setSaving(true);
    try {
      try { strings['header.cta.path'] = normalizeHeaderDestination(strings['header.cta.path'] ?? ''); }
      catch { push({ tone: 'error', title: t('cms.invalidCtaLink') }); return; }
      for (const def of GLOBAL_KEYS.filter((def) => !headerOnly || def.key.startsWith('header.cta.'))) {
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
        {GLOBAL_KEYS.filter((def) => !headerOnly || def.key.startsWith('header.cta.')).map((def) => (
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
            ) : def.key === 'header.cta.path' ? (
              <SearchSelect className={fieldClass} aria-label={t(def.labelKey)} value={strings[def.key] ?? ''} onChange={e => setStrings(s => ({...s,[def.key]:e.target.value}))}>
                {CTA_ROUTES.map(route => <option key={route} value={route}>{route || 'Home'}</option>)}
              </SearchSelect>
            ) : (
              <input
                type="text"
                value={strings[def.key] ?? ''}
                onChange={(e) =>
                  setStrings((s) => ({ ...s, [def.key]: e.target.value }))
                }
                className={fieldClass}
                placeholder={def.placeholder}
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
