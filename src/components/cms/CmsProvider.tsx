'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IntlProvider, useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';
import { publishContact } from '@/lib/hooks/useCompanyContact';
import { locales } from '@/i18n/config';
import { CmsSessionRecovery } from './CmsSessionRecovery';

// ---------------------------------------------------------------------------
// Trello #112 — Inline CMS / Visual Editor
//
// This provider is the single source of truth for the inline edit-mode system.
// It is mounted once (in the locale layout) so that `useAuth` / `useIntl` are
// available. It renders nothing visual itself — `CmsToolbar` and the
// `Editable*` components consume `useCms()` to read blocks and trigger saves.
//
// Render rule: the public site MUST keep working when the CMS API returns
// nothing. Every accessor falls back to the hardcoded value passed in by the
// caller, so a fresh/empty backend renders identically to the pre-CMS site.
// ---------------------------------------------------------------------------

/** App render locales — must match `src/i18n/config.ts`. */
export type AppLocale = 'nl' | 'en' | 'de' | 'fr';

/** Backend locale tags. French is a render locale as well as an editor tab. */
export type LocaleTag = 'nl-NL' | 'en-GB' | 'de-DE' | 'fr-FR';

const APP_TO_TAG: Record<AppLocale, LocaleTag> = {
  nl: 'nl-NL',
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
};

/** Tabs shown in the edit modals follow the app's configured render locales. */
export const EDITABLE_LOCALE_TAGS: LocaleTag[] = locales.map((locale) => APP_TO_TAG[locale]);

/** Start editors on an enabled tab, even when viewing a disabled edit locale. */
export function initialEditorLocale(locale: LocaleTag, enabled: readonly LocaleTag[]): LocaleTag {
  return enabled.includes(locale) ? locale : enabled[0] ?? locale;
}

/** Map the active app locale to the backend locale tag used for reads. */
export function appLocaleToTag(locale: string): LocaleTag {
  return APP_TO_TAG[(locale as AppLocale)] ?? 'nl-NL';
}

// --- Block shapes (mirror the documented page-content response) -------------

export interface ContentBlock {
  key: string;
  type: string;
  value: string | null;
  source?: { field_id: string; record_id: string | null; field: string; source_type: string; locale: string; publication_state: string; version: string | null; permissions: { edit: string; role: string } };
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface ImageStyle {
  brightness?: number; contrast?: number; saturation?: number;
  alignment?: 'left' | 'center' | 'right'; gradient?: 'none' | 'right' | 'bottom';
  gradient_start?: number; gradient_middle?: number; gradient_end?: number;
}
export interface MediaBlock {
  revision?: number; rotation?: number; mobile_rotation?: number; decorative?: boolean;
  original_url?: string | null; mobile_original_url?: string | null;
  adjustments_baked?: boolean; mobile_adjustments_baked?: boolean;
  mobile_uses_desktop?: boolean;
  key: string;
  image_url: string;
  alt: string;
  seo_title?: string;
  file_id?: string | null;
  mobile_file_id?: string | null;
  mobile_image_url?: string | null;
  src_set?: string | null;
  image_dimensions?: {width: number; height: number} | null;
  mobile_image_dimensions?: {width: number; height: number} | null;
  mobile_src_set?: string | null;
  mobile_focal_point?: FocalPoint | null;
  mobile_crop_data?: MediaBlock['crop_data'];
  image_style?: ImageStyle | null;
  focal_point: FocalPoint;
  overlay: number;
  crop_data?: { x: number; y: number; width: number; height: number; aspect?: number; unit?: 'percent' } | null;
}

export interface SeoData {
  title: string;
  description: string;
  og_title?: string;
  canonical_url?: string;
  robots: string;
}

export type GlobalValue = string | Partial<Record<LocaleTag, string>>;

interface PageContentResponse {
  editor_locales?: string[];
  page?: string;
  locale?: string;
  content_blocks?: ContentBlock[];
  media_blocks?: MediaBlock[];
  seo?: Partial<SeoData> | null;
  global_settings?: Record<string, GlobalValue> | null;
}

interface GlobalSettingsResponse {
  settings?: Record<string, GlobalValue> | null;
}

// --- Save payload shapes (what the modals build) ----------------------------

export interface SaveContentArgs {
  expected_revision?: string | null;
  publication?: 'draft' | 'publish';
  publish_locales?: string[];
  page: string;
  section?: string;
  type?: string;
  /** Partial map of locale-tag → value; only edited locales are sent. */
  value_by_locale: Partial<Record<LocaleTag, string>>;
}

export interface SaveMediaMetaArgs {
  image_url?: string;
  expected_revision?: number; request_id?: string;
  rotation?: number; mobile_rotation?: number; decorative?: boolean;
  image?: File | null; mobile_image?: File | null; onProgress?: (percent: number) => void;
  page?: string;
  alt_by_locale?: Partial<Record<LocaleTag, string>>;
  seo_title_by_locale?: Partial<Record<LocaleTag, string>>;
  focal_x?: number;
  focal_y?: number;
  overlay?: number;
  crop_data?: unknown;
  file_id?: string | null; mobile_file_id?: string | null;
  image_style?: ImageStyle; mobile_focal_point?: FocalPoint;
  mobile_crop_data?: MediaBlock['crop_data'];
}

export interface SaveSeoArgs {
  title_by_locale?: Partial<Record<LocaleTag, string>>;
  description_by_locale?: Partial<Record<LocaleTag, string>>;
  robots?: string;
}

interface CmsContextValue {
  editorLocales: LocaleTag[];
  /** True when the signed-in user holds the `cms.manage` permission. */
  canEdit: boolean;
  /** Whether inline edit mode is currently active. */
  editMode: boolean;
  /**
   * Edit affordances for the page that is actually on screen.
   * False while navigating, before the page registers, or after it unmounts.
   */
  isCmsEditing: boolean;
  /** Keep already-open drafts mounted while the editor signs in again. */
  retainCmsDrafts: boolean;
  setEditMode: (on: boolean) => void;
  toggleEditMode: () => void;

  /** Active app locale, and the matching backend tag for reads. */
  locale: AppLocale;
  localeTag: LocaleTag;

  /** The slug of the page currently registered for editing (if any). */
  currentPage: string | null;
  /** Pages declare their slug so the provider fetches their content. */
  registerPage: (pageSlug: string, route: string) => void;
  /** Drop a registration when that page unmounts or the route changes. */
  unregisterPage: (pageSlug: string, route: string) => void;
  /**
   * True once the first page-content fetch for `page` has settled (success or
   * failure). Until then EditableImage prefers a cached URL over the hardcoded
   * fallback so reloads do not flash the old stock photo.
   */
  isPageReady: (pageSlug: string) => boolean;

  // Read accessors — always fall back to the provided default.
  getText: (key: string, fallback?: string) => string;
  getMedia: (key: string) => MediaBlock | null;
  getGlobal: (key: string, fallback?: string) => string;

  /** Raw block lookups for the modals to seed their fields. */
  getContentBlock: (key: string) => ContentBlock | null;
  getSeo: () => SeoData | null;
  getGlobalRaw: (key: string) => GlobalValue | undefined;

  // Save helpers — call cmsService then update local state optimistically.
  saveText: (key: string, args: SaveContentArgs) => Promise<void>;
  saveTextBatch: (blocks: Array<SaveContentArgs & { key: string; expected_revision: string | null }>) => Promise<void>;
  uploadImage: (key: string, file: File, page?: string) => Promise<string>;
  saveMediaMeta: (key: string, args: SaveMediaMetaArgs) => Promise<void>;
  saveSeo: (slug: string, args: SaveSeoArgs) => Promise<void>;
  saveGlobal: (key: string, value: GlobalValue) => Promise<void>;
  saveContact: (data: Parameters<typeof cmsService.updateContact>[0]) => Promise<void>;
  guardCms: <T>(fn: () => Promise<T>) => Promise<T>;
}

const CmsContext = React.createContext<CmsContextValue | null>(null);

const PAGE_CACHE_PREFIX = 'cms:page:';

interface PageCachePayload {
  content_blocks?: ContentBlock[];
  media_blocks?: MediaBlock[];
}

function pageCacheKey(slug: string, localeTag: LocaleTag) {
  return `${PAGE_CACHE_PREFIX}${slug}:${localeTag}`;
}

function readPageCache(slug: string, localeTag: LocaleTag): PageCachePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(pageCacheKey(slug, localeTag));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PageCachePayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writePageCache(slug: string, localeTag: LocaleTag, payload: PageCachePayload) {
  if (typeof window === 'undefined' || !slug) return;
  try {
    window.sessionStorage.setItem(pageCacheKey(slug, localeTag), JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore; network fetch still works.
  }
}

function patchPageCacheMedia(
  slug: string,
  localeTag: LocaleTag,
  block: MediaBlock,
) {
  if (!slug) return;
  const existing = readPageCache(slug, localeTag) ?? {};
  const media = [...(existing.media_blocks ?? []).filter((b) => b.key !== block.key), block];
  writePageCache(slug, localeTag, { ...existing, media_blocks: media });
}

/** Pick a string out of a global value, preferring the active locale tag. */
function resolveGlobal(value: GlobalValue | undefined, tag: LocaleTag): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  return value[tag] ?? value['nl-NL'] ?? Object.values(value)[0];
}

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const { user, sessionVerified, invalidateSession } = useAuth();
  const { locale: rawLocale, messages } = useIntl();
  const locale = rawLocale as AppLocale;
  const localeTag = appLocaleToTag(locale);

  const [editorLocales, setEditorLocales] = React.useState<LocaleTag[]>(EDITABLE_LOCALE_TAGS);
  const [expiredEditor, setExpiredEditor] = React.useState<string | null>(null);
  const [previewMode, setPreviewMode] = React.useState(false);
  React.useEffect(() => setPreviewMode(window.parent !== window && new URLSearchParams(window.location.search).get('cms-media-preview') === '1'), []);
  const canEdit = !previewMode && sessionVerified && user?.role === 'super_admin' && !!user?.permissions?.includes('cms.manage');

  // Wraps every CMS write call: if the server returns 401 the stored token has
  // been invalidated (server deploy / token rotation). Clear the local session
  // so the UI reflects the logged-out state, and surface a legible Dutch message.
  const guardCms = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        if (
          typeof err === 'object' && err !== null &&
          'status' in err && (err as { status: number }).status === 401
        ) {
          setExpiredEditor(String(user?.id ?? ''));
          invalidateSession();
          throw { ...(err as object), message: 'Sessie verlopen — log opnieuw in' };
        }
        throw err;
      }
    },
    [invalidateSession, user?.id],
  );

  const pathname = usePathname();
  const [editMode, setEditModeState] = React.useState(false);
  const [registration, setRegistration] = React.useState<{ slug: string; route: string } | null>(null);
  const currentPage = registration?.route === pathname ? registration.slug : null;
  const activePage = React.useRef(currentPage);
  activePage.current = currentPage;
  const retainCmsDrafts = expiredEditor !== null && !!currentPage;
  const isCmsEditing = canEdit && editMode && !!currentPage && !retainCmsDrafts;
  const [readyPages, setReadyPages] = React.useState<Record<string, boolean>>({});

  // Keyed block stores. Maps keep last-write-wins semantics simple.
  const [content, setContent] = React.useState<Record<string, ContentBlock>>({});
  const [previewMedia, setPreviewMedia] = React.useState<MediaBlock | null>(null);
  const [media, setMedia] = React.useState<Record<string, MediaBlock>>({});
  const [seo, setSeo] = React.useState<SeoData | null>(null);
  const [globals, setGlobals] = React.useState<Record<string, GlobalValue>>({});
  const activeLocale = React.useRef(localeTag);
  const previousLocale = React.useRef(localeTag);
  activeLocale.current = localeTag;
  React.useEffect(() => {
    if (previousLocale.current === localeTag) return;
    previousLocale.current = localeTag;
    setContent({}); setMedia({}); setSeo(null); setReadyPages({});
  }, [localeTag]);

  // Editing is meaningless without permission — force it off if it flips.
  const setEditMode = React.useCallback(
    (on: boolean) => setEditModeState(canEdit ? on : false),
    [canEdit],
  );
  const toggleEditMode = React.useCallback(
    () => setEditModeState((v) => (canEdit ? !v : false)),
    [canEdit],
  );
  React.useEffect(() => {
    if (!canEdit && expiredEditor === null) setEditModeState(false);
  }, [canEdit, expiredEditor]);
  React.useEffect(() => {
    if (canEdit && expiredEditor === String(user?.id)) setExpiredEditor(null);
  }, [canEdit, expiredEditor, user?.id]);
  React.useEffect(() => { setExpiredEditor(null); }, [pathname]);

  const mergeContentBlocks = React.useCallback((blocks: ContentBlock[] | undefined) => {
    if (!blocks?.length) return;
    setContent((prev) => {
      const next = { ...prev };
      for (const b of blocks) if (b?.key) next[b.key] = b;
      return next;
    });
  }, []);

  const mergeMediaBlocks = React.useCallback((blocks: MediaBlock[] | undefined) => {
    if (!blocks?.length) return;
    setMedia((prev) => {
      const next = { ...prev };
      for (const b of blocks) if (b?.key) next[b.key] = b;
      return next;
    });
  }, []);

  // Fetch a page's content/media/seo when it registers (and when locale changes).
  const fetchPage = React.useCallback(
    async (slug: string) => {
      try {
        const res = (await cmsService.pageContent(slug, localeTag)) as PageContentResponse;
        if (activeLocale.current !== localeTag) return;
        if (res.editor_locales) {
          const active = EDITABLE_LOCALE_TAGS.filter(tag => res.editor_locales!.includes(tag));
          setEditorLocales(previous => JSON.stringify(previous) === JSON.stringify(active) ? previous : active);
        }
        mergeContentBlocks(res?.content_blocks);
        mergeMediaBlocks(res?.media_blocks);
        writePageCache(slug, localeTag, {
          content_blocks: res?.content_blocks ?? [],
          media_blocks: res?.media_blocks ?? [],
        });
        if (res?.seo && activePage.current === slug) {
          setSeo({
            title: res.seo.title ?? '',
            description: res.seo.description ?? '',
            og_title: res.seo.og_title,
            canonical_url: res.seo.canonical_url,
            robots: res.seo.robots ?? 'index,follow',
          });
        }
        if (res?.global_settings) {
          setGlobals((prev) => {
            const next = { ...prev };
            for (const [key, value] of Object.entries(res.global_settings ?? {})) {
              const existing = prev[key];
              next[key] = typeof existing === 'object' && typeof value === 'string'
                ? { ...existing, [localeTag]: value } : value;
            }
            return next;
          });
        }
      } catch {
        // Public render must never break — silently keep the fallbacks / cache.
      } finally {
        if (activeLocale.current === localeTag) setReadyPages((prev) => ({ ...prev, [slug]: true }));
      }
    },
    [localeTag, mergeContentBlocks, mergeMediaBlocks],
  );

  const registerPage = React.useCallback(
    (pageSlug: string, route: string) => {
      const slug = pageSlug.trim();
      if (!slug || !route) return;
      const routeSlug = route.replace(/^\/(nl|en|de|fr)(?:\/|$)/, '').replace(/\/$/, '') || 'home';
      if (slug !== routeSlug) return;
      // Seed last-known blocks before paint so heroes do not flash fallbackSrc.
      const cached = readPageCache(slug, localeTag);
      if (cached?.content_blocks?.length) mergeContentBlocks(cached.content_blocks);
      if (cached?.media_blocks?.length) mergeMediaBlocks(cached.media_blocks);
      setRegistration({ slug, route });
      setSeo(null);
    },
    [localeTag, mergeContentBlocks, mergeMediaBlocks],
  );

  const unregisterPage = React.useCallback((pageSlug: string, route: string) => {
    const slug = pageSlug.trim();
    setRegistration((prev) => prev?.slug === slug && prev.route === route ? null : prev);
  }, []);

  const isPageReady = React.useCallback(
    (pageSlug: string) => !!readyPages[pageSlug.trim()],
    [readyPages],
  );

  // (Re)fetch whenever the registered page or locale changes.
  React.useEffect(() => {
    if (!currentPage) return;
    // Locale change: re-seed that locale's cache, then refresh from the network.
    const cached = readPageCache(currentPage, localeTag);
    if (cached?.content_blocks?.length) mergeContentBlocks(cached.content_blocks);
    if (cached?.media_blocks?.length) mergeMediaBlocks(cached.media_blocks);
    setReadyPages((prev) => ({ ...prev, [currentPage]: false }));
    void fetchPage(currentPage);
  }, [currentPage, fetchPage, localeTag, mergeContentBlocks, mergeMediaBlocks]);

  // Always load global page media (site logo, shared header assets) so the
  // logo resolves on every route — including before a page slug registers.
  React.useEffect(() => {
    const cached = readPageCache('global', localeTag);
    if (cached?.media_blocks?.length) mergeMediaBlocks(cached.media_blocks);
    if (cached?.content_blocks?.length) mergeContentBlocks(cached.content_blocks);
    void fetchPage('global');
  }, [fetchPage, localeTag, mergeContentBlocks, mergeMediaBlocks]);

  // Editors get the full global-settings set so the Global modal can show all
  // known keys regardless of which page is open. Non-editors rely on whatever
  // arrives in `page-content.global_settings`.
  React.useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = (await cmsService.globalSettings()) as GlobalSettingsResponse;
        if (!cancelled && res?.settings) {
          setGlobals((prev) => ({ ...prev, ...res.settings }));
        }
      } catch {
        // ignore — Global modal still works off page-provided settings.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  // --- Read accessors -------------------------------------------------------

  const getText = React.useCallback(
    (key: string, fallback = '') => content[key]?.value ?? fallback,
    [content],
  );
  React.useEffect(() => {
    if (!previewMode) return;
    const receive = (event:MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'cms-media-preview' || typeof event.data.draft?.key !== 'string') return;
      setPreviewMedia(event.data.draft);
      requestAnimationFrame(() => {
        const block = Array.from(document.querySelectorAll('[data-cms-block]')).find(node => node.getAttribute('data-cms-block') === event.data.draft.key);
        const top = block?.getBoundingClientRect().top;
        if (top !== undefined) window.scrollTo(0, window.scrollY + top - 100);
      });
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({type:'cms-media-preview-ready'}, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, [previewMode]);
  const getMedia = React.useCallback((key: string) => previewMedia?.key === key ? previewMedia : media[key] ?? null, [media, previewMedia]);
  const getContentBlock = React.useCallback(
    (key: string) => content[key] ?? null,
    [content],
  );
  const getSeo = React.useCallback(() => seo, [seo]);
  const getGlobalRaw = React.useCallback((key: string) => globals[key], [globals]);
  const getGlobal = React.useCallback(
    (key: string, fallback = '') => resolveGlobal(globals[key], localeTag) ?? fallback,
    [globals, localeTag],
  );

  // --- Save helpers (optimistic) -------------------------------------------

  const assertWritablePage = React.useCallback((page?: string) => {
    if (!isCmsEditing) {
      throw new Error('CMS edit is not active for this page.');
    }
    if (page && page !== 'global' && page !== currentPage) {
      throw new Error('CMS write does not match the current page.');
    }
  }, [isCmsEditing, currentPage]);

  const saveText = React.useCallback(
    (key: string, args: SaveContentArgs) =>
      guardCms(async () => {
        assertWritablePage(args.page);
        const saved = await cmsService.saveContentBlock(key, {
          page: args.page,
          section: args.section,
          type: args.type ?? 'short_text',
          value_by_locale: args.value_by_locale,
          expected_revision: args.expected_revision,
          publication: args.publication ?? 'publish',
          publish_locales: args.publish_locales ?? (Object.keys(args.value_by_locale).length ? Object.keys(args.value_by_locale) : [localeTag]),
        });
        if (args.publication === 'draft') return;
        const publicValues = saved.published_value_by_locale ?? saved.value_by_locale;
        const optimistic = (publicValues as Record<string, string> | undefined)?.[localeTag] ?? args.value_by_locale[localeTag];
        if (optimistic != null) {
          // Registration replays this cache before the network responds. Keep it
          // in step with saves so a reload cannot briefly restore the old text.
          const cached = readPageCache(args.page, localeTag) ?? {};
          const block: ContentBlock = { key, type: args.type ?? 'short_text', value: optimistic, source: saved.source as ContentBlock['source'] };
          writePageCache(args.page, localeTag, {
            ...cached,
            content_blocks: [...(cached.content_blocks ?? []).filter((b) => b.key !== key), block],
          });
          setContent((prev) => ({
            ...prev,
            [key]: block,
          }));
        }
      }),
    [guardCms, localeTag, assertWritablePage],
  );

  const saveTextBatch = React.useCallback(
    (blocks: Array<SaveContentArgs & { key: string; expected_revision: string | null }>) => guardCms(async () => {
      for (const block of blocks) assertWritablePage(block.page);
      const response = await cmsService.saveContentBlocks(blocks.map((block) => ({ ...block, publication: block.publication ?? 'publish',
        publish_locales: block.publish_locales ?? (Object.keys(block.value_by_locale).length ? Object.keys(block.value_by_locale) : [localeTag]),
      })));
      // Update state and the reload cache only after the entire transaction commits.
      const updates: Record<string, ContentBlock> = {};
      for (const block of blocks) {
        if (block.publication === 'draft') continue;
        const serverRecord = response.data?.find(saved => saved.key === block.key);
        const value = (serverRecord?.published_value_by_locale ?? serverRecord?.value_by_locale)?.[localeTag] ?? block.value_by_locale[localeTag];
        if (value == null) continue;
        const saved: ContentBlock = { key: block.key, type: block.type ?? 'short_text', value, source: serverRecord?.source as ContentBlock['source'] };
        updates[block.key] = saved;
        const cached = readPageCache(block.page, localeTag) ?? {};
        writePageCache(block.page, localeTag, { ...cached, content_blocks: [
          ...(cached.content_blocks ?? []).filter((item) => item.key !== block.key), saved,
        ] });
      }
      setContent((previous) => ({ ...previous, ...updates }));
    }), [guardCms, assertWritablePage, localeTag],
  );

  const uploadImage = React.useCallback(
    (key: string, file: File, page?: string) =>
      guardCms(async () => {
        assertWritablePage(page);
        const pageSlug = (page || currentPage || '').trim();
        const fd = new FormData();
        fd.append('image', file);
        if (pageSlug) fd.append('page', pageSlug);
        const res = (await cmsService.uploadMediaBlock(key, fd)) as Partial<MediaBlock>;
        const url = res?.image_url ?? '';
        if (url) {
          setMedia((prev) => {
            const next: MediaBlock = {
              ...prev[key],
              ...res,
              key,
              image_url: url,
              alt: prev[key]?.alt ?? '',
              focal_point: prev[key]?.focal_point ?? { x: 50, y: 50 },
              overlay: prev[key]?.overlay ?? 0,
            };
            if (pageSlug) patchPageCacheMedia(pageSlug, localeTag, next);
            return { ...prev, [key]: next };
          });
        }
        return url;
      }),
    [guardCms, currentPage, localeTag, assertWritablePage],
  );

  const saveMediaMeta = React.useCallback(
    (key: string, args: SaveMediaMetaArgs) =>
      guardCms(async () => {
        assertWritablePage(args.page);
        const {image, mobile_image, onProgress, ...metadata} = args;
        const saved = await cmsService.publishMediaBlock(key, {
          ...metadata, page:args.page || currentPage || undefined,
        }, image, mobile_image, onProgress);
        const canonicalAlts = saved.alt_by_locale as SaveMediaMetaArgs['alt_by_locale'];
        const canonicalTitles = saved.seo_title_by_locale as SaveMediaMetaArgs['seo_title_by_locale'];
        setMedia((prev) => {
          const existing = prev[key] ?? { key, image_url: '', alt: '', focal_point: { x: 50, y: 50 }, overlay: 0 };
          const next: MediaBlock = {
            ...existing,
            ...(saved as Partial<MediaBlock>),
            alt: saved.decorative ? '' : canonicalAlts?.[localeTag] ?? args.alt_by_locale?.[localeTag] ?? existing.alt,
            seo_title: canonicalTitles?.[localeTag] ?? args.seo_title_by_locale?.[localeTag] ?? existing.seo_title,
            focal_point: {
              x: args.focal_x ?? existing.focal_point.x,
              y: args.focal_y ?? existing.focal_point.y,
            },
            overlay: args.overlay ?? existing.overlay,
          };
          const pageSlug = (args.page || currentPage || '').trim();
          if (pageSlug) patchPageCacheMedia(pageSlug, localeTag, next);
          return { ...prev, [key]: next };
        });
      }),
    [guardCms, localeTag, currentPage, assertWritablePage],
  );

  const saveSeo = React.useCallback(
    (slug: string, args: SaveSeoArgs) =>
      guardCms(async () => {
        assertWritablePage(slug);
        await cmsService.saveSeo(slug, {
          title_by_locale: args.title_by_locale,
          description_by_locale: args.description_by_locale,
          robots: args.robots,
        });
        setSeo((prev) => ({
          title: args.title_by_locale?.[localeTag] ?? prev?.title ?? '',
          description: args.description_by_locale?.[localeTag] ?? prev?.description ?? '',
          og_title: prev?.og_title,
          canonical_url: prev?.canonical_url,
          robots: args.robots ?? prev?.robots ?? 'index,follow',
        }));
      }),
    [guardCms, localeTag, assertWritablePage],
  );

  const saveContact = React.useCallback(
    (data: Parameters<typeof cmsService.updateContact>[0]) => guardCms(async () => {
      assertWritablePage();
      const { company, revision, field_sources } = await cmsService.updateContact(data);
      publishContact(company, { revision, field_sources });
      setGlobals(prev => ({ ...prev,
        'company.email': company.email, 'company.phone': company.phone ?? '',
        'company.address.street': company.address.street,
        'company.address.postal_code': company.address.postal_code,
        'company.address.city': company.address.city,
      }));
    }), [guardCms, assertWritablePage],
  );

  const saveGlobal = React.useCallback(
    (key: string, value: GlobalValue) =>
      guardCms(async () => {
        assertWritablePage();
        await cmsService.saveGlobalSetting(key, { value });
        setGlobals((prev) => ({ ...prev, [key]: value }));
        if (key.startsWith('company.')) window.dispatchEvent(new Event('company-contact-changed'));
      }),
    [guardCms, assertWritablePage],
  );

  const value = React.useMemo<CmsContextValue>(
    () => ({
      editorLocales,
      canEdit,
      editMode,
      isCmsEditing,
      retainCmsDrafts,
      setEditMode,
      toggleEditMode,
      locale,
      localeTag,
      currentPage,
      registerPage,
      unregisterPage,
      isPageReady,
      getText,
      getMedia,
      getGlobal,
      getContentBlock,
      getSeo,
      getGlobalRaw,
      saveText,
      saveTextBatch,
      uploadImage,
      saveMediaMeta,
      saveSeo,
      saveGlobal,
      saveContact,
      guardCms,
    }),
    [
      editorLocales,
      canEdit,
      editMode,
      isCmsEditing,
      retainCmsDrafts,
      setEditMode,
      toggleEditMode,
      locale,
      localeTag,
      currentPage,
      registerPage,
      unregisterPage,
      isPageReady,
      getText,
      getMedia,
      getGlobal,
      getContentBlock,
      getSeo,
      getGlobalRaw,
      saveText,
      saveTextBatch,
      uploadImage,
      saveMediaMeta,
      saveSeo,
      saveGlobal,
      saveContact,
      guardCms,
    ],
  );

  const translationOverrides = React.useMemo(() => Object.fromEntries(
    Object.values(content).flatMap((block) => block.key.startsWith('i18n.') && typeof block.value === 'string'
      ? [[block.key.slice(5), block.value]] : []),
  ), [content]);
  return <CmsContext.Provider value={value}>
    <IntlProvider locale={locale} messages={messages} overrides={translationOverrides}>
      {children}
      {retainCmsDrafts && <CmsSessionRecovery onDiscard={() => { setExpiredEditor(null); setEditModeState(false); }} />}
    </IntlProvider>
  </CmsContext.Provider>;
}

export function useCms(): CmsContextValue {
  const ctx = React.useContext(CmsContext);
  if (!ctx) throw new Error('useCms must be used inside CmsProvider');
  return ctx;
}

/** Close page dialogs on navigation/permission loss, retaining a failed save. */
export function useCmsEditorOpen() {
  const pathname = usePathname();
  const { currentPage, isCmsEditing, retainCmsDrafts } = useCms();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { setOpen(false); }, [pathname, currentPage]);
  React.useEffect(() => {
    if (!isCmsEditing && !retainCmsDrafts) setOpen(false);
  }, [isCmsEditing, retainCmsDrafts]);
  return [open, setOpen] as const;
}

/**
 * Convenience hook for pages: register the slug before paint so session-cached
 * media can seed the first frame (avoids fallback → CMS image flash on reload).
 */
export function useRegisterCmsPage(pageSlug: string) {
  const pathname = usePathname();
  const { registerPage, unregisterPage } = useCms();
  React.useLayoutEffect(() => {
    const slug = pageSlug.trim();
    if (!slug) return;
    registerPage(slug, pathname);
    return () => unregisterPage(slug, pathname);
  }, [registerPage, unregisterPage, pageSlug, pathname]);
}
