'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { cmsService } from '@/lib/services';

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

/** Tabs shown in the edit modals (order matters for the UI). */
export const EDITABLE_LOCALE_TAGS: LocaleTag[] = ['nl-NL', 'en-GB', 'de-DE', 'fr-FR'];

const APP_TO_TAG: Record<AppLocale, LocaleTag> = {
  nl: 'nl-NL',
  en: 'en-GB',
  de: 'de-DE',
};

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
  alt_by_locale?: Partial<Record<LocaleTag, string>>;
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
  uploadImage: (key: string, file: File) => Promise<string>;
  saveMediaMeta: (key: string, args: SaveMediaMetaArgs) => Promise<void>;
  saveSeo: (slug: string, args: SaveSeoArgs) => Promise<void>;
  saveGlobal: (key: string, value: GlobalValue) => Promise<void>;
}

const CmsContext = React.createContext<CmsContextValue | null>(null);

/** Pick a string out of a global value, preferring the active locale tag. */
function resolveGlobal(value: GlobalValue | undefined, tag: LocaleTag): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  return value[tag] ?? value['nl-NL'] ?? Object.values(value)[0];
}

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { locale: rawLocale } = useIntl();
  const locale = rawLocale as AppLocale;
  const localeTag = appLocaleToTag(locale);

  const canEdit = !!user?.permissions?.includes('cms.manage');

  const [editMode, setEditModeState] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<string | null>(null);

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
        // Public render must never break — silently keep the fallbacks.
      }
    },
    [localeTag, mergeContentBlocks, mergeMediaBlocks],
  );

  const registerPage = React.useCallback(
    (pageSlug: string) => {
      const slug = pageSlug.trim();
      if (!slug) return; // opt-out: keep whatever page (if any) is registered
      setCurrentPage((prev) => (prev === slug ? prev : slug));
    },
    [],
  );

  // (Re)fetch whenever the registered page or locale changes.
  React.useEffect(() => {
    if (!currentPage) return;
    void fetchPage(currentPage);
  }, [currentPage, fetchPage]);

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
    async (key: string, args: SaveContentArgs) => {
      await cmsService.saveContentBlock(key, {
        page: args.page,
        section: args.section,
        type: args.type ?? 'short_text',
        value_by_locale: args.value_by_locale,
      });
      const optimistic = args.value_by_locale[localeTag];
      if (optimistic != null) {
        setContent((prev) => ({
          ...prev,
          [key]: { key, type: args.type ?? prev[key]?.type ?? 'short_text', value: optimistic },
        }));
      }
    },
    [localeTag],
  );

  const uploadImage = React.useCallback(async (key: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = (await cmsService.uploadMediaBlock(key, fd)) as { image_url?: string };
    const url = res?.image_url ?? '';
    if (url) {
      setMedia((prev) => ({
        ...prev,
        [key]: {
          key,
          image_url: url,
          alt: prev[key]?.alt ?? '',
          focal_point: prev[key]?.focal_point ?? { x: 50, y: 50 },
          overlay: prev[key]?.overlay ?? 0,
        },
      }));
    }
    return url;
  }, []);

  const saveMediaMeta = React.useCallback(
    async (key: string, args: SaveMediaMetaArgs) => {
      await cmsService.saveMediaBlock(key, {
        alt_by_locale: args.alt_by_locale,
        focal_x: args.focal_x,
        focal_y: args.focal_y,
        overlay: args.overlay,
        crop_data: args.crop_data,
      });
      setMedia((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        return {
          ...prev,
          [key]: {
            ...existing,
            alt: args.alt_by_locale?.[localeTag] ?? existing.alt,
            focal_point: {
              x: args.focal_x ?? existing.focal_point.x,
              y: args.focal_y ?? existing.focal_point.y,
            },
            overlay: args.overlay ?? existing.overlay,
          },
        };
      });
    },
    [localeTag],
  );

  const saveSeo = React.useCallback(
    async (slug: string, args: SaveSeoArgs) => {
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
    },
    [localeTag],
  );

  const saveGlobal = React.useCallback(async (key: string, value: GlobalValue) => {
    await cmsService.saveGlobalSetting(key, { value });
    setGlobals((prev) => ({ ...prev, [key]: value }));
  }, []);

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
 * Convenience hook for pages: register the slug once on mount. Keeps page
 * components from importing React effects directly just to declare their slug.
 */
export function useRegisterCmsPage(pageSlug: string) {
  const { registerPage } = useCms();
  React.useEffect(() => {
    registerPage(pageSlug);
  }, [registerPage, pageSlug]);
}
