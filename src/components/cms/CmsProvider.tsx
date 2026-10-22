'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';
import { locales } from '@/i18n/config';

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
export type AppLocale = 'nl' | 'en' | 'de';

/**
 * Backend locale tags. The app renders one of nl/en/de, but the editor exposes
 * an extra `fr-FR` tab so editors can author French even though there is no
 * French render locale yet.
 */
export type LocaleTag = 'nl-NL' | 'en-GB' | 'de-DE' | 'fr-FR';

const APP_TO_TAG: Record<AppLocale, LocaleTag> = {
  nl: 'nl-NL',
  en: 'en-GB',
  de: 'de-DE',
};

/** Tabs shown in the edit modals follow the app's configured render locales. */
export const EDITABLE_LOCALE_TAGS: LocaleTag[] = locales.map((locale) => APP_TO_TAG[locale]);

/** Map the active app locale to the backend locale tag used for reads. */
export function appLocaleToTag(locale: string): LocaleTag {
  return APP_TO_TAG[(locale as AppLocale)] ?? 'nl-NL';
}

// --- Block shapes (mirror the documented page-content response) -------------

export interface ContentBlock {
  key: string;
  type: string;
  value: string;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface MediaBlock {
  key: string;
  image_url: string;
  alt: string;
  seo_title?: string;
  focal_point: FocalPoint;
  overlay: number;
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
  page: string;
  section?: string;
  type?: string;
  /** Partial map of locale-tag → value; only edited locales are sent. */
  value_by_locale: Partial<Record<LocaleTag, string>>;
}

export interface SaveMediaMetaArgs {
  page?: string;
  alt_by_locale?: Partial<Record<LocaleTag, string>>;
  seo_title_by_locale?: Partial<Record<LocaleTag, string>>;
  focal_x?: number;
  focal_y?: number;
  overlay?: number;
  crop_data?: unknown;
}

export interface SaveSeoArgs {
  title_by_locale?: Partial<Record<LocaleTag, string>>;
  description_by_locale?: Partial<Record<LocaleTag, string>>;
  robots?: string;
}

interface CmsContextValue {
  /** True when the signed-in user holds the `cms.manage` permission. */
  canEdit: boolean;
  /** Whether inline edit mode is currently active. */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  toggleEditMode: () => void;

  /** Active app locale, and the matching backend tag for reads. */
  locale: AppLocale;
  localeTag: LocaleTag;

  /** The slug of the page currently registered for editing (if any). */
  currentPage: string | null;
  /** Pages declare their slug so the provider fetches their content. */
  registerPage: (pageSlug: string) => void;
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
  uploadImage: (key: string, file: File, page?: string) => Promise<string>;
  saveMediaMeta: (key: string, args: SaveMediaMetaArgs) => Promise<void>;
  saveSeo: (slug: string, args: SaveSeoArgs) => Promise<void>;
  saveGlobal: (key: string, value: GlobalValue) => Promise<void>;
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
  const { user, signOut } = useAuth();
  const { locale: rawLocale } = useIntl();
  const locale = rawLocale as AppLocale;
  const localeTag = appLocaleToTag(locale);

  const canEdit = !!user?.permissions?.includes('cms.manage');

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
          void signOut();
          throw { ...(err as object), message: 'Sessie verlopen — log opnieuw in' };
        }
        throw err;
      }
    },
    [signOut],
  );

  const [editMode, setEditModeState] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<string | null>(null);
  const [readyPages, setReadyPages] = React.useState<Record<string, boolean>>({});

  // Keyed block stores. Maps keep last-write-wins semantics simple.
  const [content, setContent] = React.useState<Record<string, ContentBlock>>({});
  const [media, setMedia] = React.useState<Record<string, MediaBlock>>({});
  const [seo, setSeo] = React.useState<SeoData | null>(null);
  const [globals, setGlobals] = React.useState<Record<string, GlobalValue>>({});

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
    if (!canEdit) setEditModeState(false);
  }, [canEdit]);

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
        mergeContentBlocks(res?.content_blocks);
        mergeMediaBlocks(res?.media_blocks);
        writePageCache(slug, localeTag, {
          content_blocks: res?.content_blocks ?? [],
          media_blocks: res?.media_blocks ?? [],
        });
        if (res?.seo) {
          setSeo({
            title: res.seo.title ?? '',
            description: res.seo.description ?? '',
            og_title: res.seo.og_title,
            canonical_url: res.seo.canonical_url,
            robots: res.seo.robots ?? 'index,follow',
          });
        }
        if (res?.global_settings) {
          setGlobals((prev) => ({ ...prev, ...res.global_settings }));
        }
      } catch {
        // Public render must never break — silently keep the fallbacks / cache.
      } finally {
        setReadyPages((prev) => ({ ...prev, [slug]: true }));
      }
    },
    [localeTag, mergeContentBlocks, mergeMediaBlocks],
  );

  const registerPage = React.useCallback(
    (pageSlug: string) => {
      const slug = pageSlug.trim();
      if (!slug) return; // opt-out: keep whatever page (if any) is registered
      // Seed last-known blocks before paint so heroes do not flash fallbackSrc.
      const cached = readPageCache(slug, localeTag);
      if (cached?.content_blocks?.length) mergeContentBlocks(cached.content_blocks);
      if (cached?.media_blocks?.length) mergeMediaBlocks(cached.media_blocks);
      setCurrentPage((prev) => (prev === slug ? prev : slug));
    },
    [localeTag, mergeContentBlocks, mergeMediaBlocks],
  );

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
  const getMedia = React.useCallback((key: string) => media[key] ?? null, [media]);
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

  const saveText = React.useCallback(
    (key: string, args: SaveContentArgs) =>
      guardCms(async () => {
        await cmsService.saveContentBlock(key, {
          page: args.page,
          section: args.section,
          type: args.type ?? 'short_text',
          value_by_locale: args.value_by_locale,
        });
        if (args.page === 'global') {
          let merged: GlobalValue = args.value_by_locale;
          setGlobals((prev) => {
            const existing = prev[key];
            merged = {
              ...(typeof existing === 'object' && existing ? existing : {}),
              ...args.value_by_locale,
            };
            return { ...prev, [key]: merged };
          });
          await cmsService.saveGlobalSetting(key, { value: merged });
        }
        const optimistic = args.value_by_locale[localeTag];
        if (optimistic != null) {
          setContent((prev) => ({
            ...prev,
            [key]: { key, type: args.type ?? prev[key]?.type ?? 'short_text', value: optimistic },
          }));
        }
      }),
    [guardCms, localeTag],
  );

  const uploadImage = React.useCallback(
    (key: string, file: File, page?: string) =>
      guardCms(async () => {
        const pageSlug = (page || currentPage || '').trim();
        const fd = new FormData();
        fd.append('image', file);
        if (pageSlug) fd.append('page', pageSlug);
        const res = (await cmsService.uploadMediaBlock(key, fd)) as { image_url?: string };
        const url = res?.image_url ?? '';
        if (url) {
          setMedia((prev) => {
            const next: MediaBlock = {
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
    [guardCms, currentPage, localeTag],
  );

  const saveMediaMeta = React.useCallback(
    (key: string, args: SaveMediaMetaArgs) =>
      guardCms(async () => {
        await cmsService.saveMediaBlock(key, {
          page: args.page || currentPage || undefined,
          alt_by_locale: args.alt_by_locale,
          seo_title_by_locale: args.seo_title_by_locale,
          focal_x: args.focal_x,
          focal_y: args.focal_y,
          overlay: args.overlay,
          crop_data: args.crop_data,
        });
        setMedia((prev) => {
          const existing = prev[key];
          if (!existing) return prev;
          const next: MediaBlock = {
            ...existing,
            alt: args.alt_by_locale?.[localeTag] ?? existing.alt,
            seo_title: args.seo_title_by_locale?.[localeTag] ?? existing.seo_title,
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
    [guardCms, localeTag, currentPage],
  );

  const saveSeo = React.useCallback(
    (slug: string, args: SaveSeoArgs) =>
      guardCms(async () => {
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
    [guardCms, localeTag],
  );

  const saveGlobal = React.useCallback(
    (key: string, value: GlobalValue) =>
      guardCms(async () => {
        await cmsService.saveGlobalSetting(key, { value });
        setGlobals((prev) => ({ ...prev, [key]: value }));
      }),
    [guardCms],
  );

  const value = React.useMemo<CmsContextValue>(
    () => ({
      canEdit,
      editMode,
      setEditMode,
      toggleEditMode,
      locale,
      localeTag,
      currentPage,
      registerPage,
      isPageReady,
      getText,
      getMedia,
      getGlobal,
      getContentBlock,
      getSeo,
      getGlobalRaw,
      saveText,
      uploadImage,
      saveMediaMeta,
      saveSeo,
      saveGlobal,
    }),
    [
      canEdit,
      editMode,
      setEditMode,
      toggleEditMode,
      locale,
      localeTag,
      currentPage,
      registerPage,
      isPageReady,
      getText,
      getMedia,
      getGlobal,
      getContentBlock,
      getSeo,
      getGlobalRaw,
      saveText,
      uploadImage,
      saveMediaMeta,
      saveSeo,
      saveGlobal,
    ],
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms(): CmsContextValue {
  const ctx = React.useContext(CmsContext);
  if (!ctx) throw new Error('useCms must be used inside CmsProvider');
  return ctx;
}

/**
 * Convenience hook for pages: register the slug before paint so session-cached
 * media can seed the first frame (avoids fallback → CMS image flash on reload).
 */
export function useRegisterCmsPage(pageSlug: string) {
  const { registerPage } = useCms();
  React.useLayoutEffect(() => {
    registerPage(pageSlug);
  }, [registerPage, pageSlug]);
}
