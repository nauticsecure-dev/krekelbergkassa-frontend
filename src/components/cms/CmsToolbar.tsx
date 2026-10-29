'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Eye, Pencil, Search, Settings, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms, useCmsEditorOpen } from './CmsProvider';
import { GlobalSettingsModal, SeoEditModal } from './CmsModals';
import { ContactSubjectsEditor } from './ContactSubjectsEditor';
import { Modal } from '@/components/ui/Modal';
import { TranslationCatalog } from './TranslationCatalog';

/**
 * Floating editor toolbar (bottom-right). Rendered only for users holding
 * `cms.manage`; entirely absent (no DOM, no-op) for everyone else.
 */
export function CmsToolbar() {
  const pathname = usePathname();
  return <CmsToolbarInner key={pathname} />;
}

function CmsToolbarInner() {
  const { t, locale } = useIntl();
  const { canEdit, editMode, isCmsEditing, retainCmsDrafts, toggleEditMode, currentPage } = useCms();
  const [subjectsOpen, setSubjectsOpen] = useCmsEditorOpen();
  const [seoOpen, setSeoOpen] = useCmsEditorOpen();
  const [globalOpen, setGlobalOpen] = useCmsEditorOpen();
  const [translationsOpen, setTranslationsOpen] = useCmsEditorOpen();

  // Keep page content and edit pencils clear of the fixed bottom-right toolbar.
  React.useEffect(() => {
    if (!canEdit) return;
    document.documentElement.dataset.cmsToolbar = 'true';
    return () => {
      delete document.documentElement.dataset.cmsToolbar;
    };
  }, [canEdit]);

  if (!canEdit && !retainCmsDrafts) return null;

  return (
    <>
      <div
        style={!canEdit ? { display: 'none' } : undefined}
        className="fixed bottom-5 right-5 z-[90] flex items-center gap-1.5 rounded-full border border-navy-100 bg-white/95 px-2 py-1.5 shadow-elev backdrop-blur"
        role="toolbar"
        aria-label={t('cms.toolbarLabel')}
      >
        <button
          type="button"
          onClick={toggleEditMode}
          disabled={!currentPage}
          aria-pressed={editMode}
          aria-label={editMode ? t('cms.exitEdit') : t('cms.enterEdit')}
          title={editMode ? t('cms.exitEdit') : t('cms.enterEdit')}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition',
            editMode
              ? 'bg-gold-500 text-white hover:bg-gold-600'
              : 'bg-navy-900 text-white hover:bg-navy-800',
          )}
        >
          {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {editMode ? t('cms.editingOn') : t('cms.edit')}
          </span>
        </button>

        <span className="mx-0.5 h-6 w-px bg-navy-100" aria-hidden />
        {isCmsEditing ? <button type="button" onClick={() => setTranslationsOpen(true)}
          aria-label={t('cms.allTranslations')} title={t('cms.allTranslations')}
          className="h-9 rounded-full px-2 text-sm font-semibold text-navy-600">Aa</button> : null}

        <button
          type="button"
          onClick={() => setSeoOpen(true)}
          disabled={!isCmsEditing}
          aria-label={t('cms.seoTitle')}
          title={t('cms.seoTitle')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setGlobalOpen(true)}
          disabled={!isCmsEditing}
          aria-label={t('cms.globalTitle')}
          title={t('cms.globalTitle')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
        >
          <Settings className="h-4 w-4" />
        </button>

        {isCmsEditing && currentPage === 'contact' && <button type="button" onClick={() => setSubjectsOpen(true)} aria-label={t('contactSubjects.title')} title={t('contactSubjects.title')} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-50"><Mail className="h-4 w-4" /></button>}
        <Link
          href={`/${locale}/admin/kalender`}
          aria-label={t('cms.openingHours')}
          title={t('cms.openingHours')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
        >
          <Clock className="h-4 w-4" />
        </Link>
      </div>

      <Modal open={subjectsOpen} onClose={() => setSubjectsOpen(false)} size="xl"><div className="overflow-y-auto p-6">{subjectsOpen && <ContactSubjectsEditor />}</div></Modal>
      <SeoEditModal open={seoOpen} onClose={() => setSeoOpen(false)} pageSlug={currentPage} />
      <GlobalSettingsModal open={globalOpen} onClose={() => setGlobalOpen(false)} />
      <TranslationCatalog key={String(translationsOpen)} open={translationsOpen} onClose={() => setTranslationsOpen(false)} />
    </>
  );
}
