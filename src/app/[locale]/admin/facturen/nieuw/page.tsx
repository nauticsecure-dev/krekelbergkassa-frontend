'use client';

import Link from 'next/link';
import { ArrowLeft, FileUp, FileText } from 'lucide-react';
import { AdminContent, AdminSectionCard } from '@/components/admin/AdminUi';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';

export default function NewInvoicePage() {
  const { locale, t } = useIntl();

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.invoices.new')}
        subtitle={t('adminNew.invoices.createIntro', { defaultValue: 'Kies hoe u de factuur wilt aanmaken.' })}
        rightSlot={
          <Link href={`/${locale}/admin/facturen`}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.invoices.backToRegister', { defaultValue: 'Terug naar facturen' })}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.invoices.createChoice', { defaultValue: 'Hoe wilt u beginnen?' })}
          description={t('adminNew.invoices.createChoiceDescription', { defaultValue: 'Importeer een bestaande factuur of stel een nieuwe factuur handmatig op.' })}
          icon={FileText}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href={`/${locale}/admin/facturen/import`}
              className="group rounded-2xl border border-navy-200 bg-white p-6 transition hover:border-marine-400 hover:shadow-md"
            >
              <FileUp className="h-8 w-8 text-marine-700" />
              <h2 className="mt-4 text-lg font-semibold text-navy-900">
                {t('adminNew.invoices.importPdf', { defaultValue: 'PDF importeren' })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-navy-500">
                {t('adminNew.invoices.importPdfDescription', { defaultValue: 'Upload het document naar de importwachtrij om de gegevens te laten uitlezen en te controleren.' })}
              </p>
              <Button type="button" variant="outline" className="mt-5">
                {t('adminNew.invoices.goToImport', { defaultValue: 'Naar PDF-import' })}
              </Button>
            </Link>
            <Link
              href={`/${locale}/admin/facturen/nieuw/handmatig`}
              className="group rounded-2xl border border-navy-200 bg-white p-6 transition hover:border-marine-400 hover:shadow-md"
            >
              <FileText className="h-8 w-8 text-gold-600" />
              <h2 className="mt-4 text-lg font-semibold text-navy-900">
                {t('adminNew.invoices.manualCreate', { defaultValue: 'Handmatig maken' })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-navy-500">
                {t('adminNew.invoices.manualCreateDescription', { defaultValue: 'Stel een factuur op met een klant en eigen factuurregels.' })}
              </p>
              <Button type="button" variant="gold" className="mt-5">
                {t('adminNew.invoices.startManual', { defaultValue: 'Handmatige factuur starten' })}
              </Button>
            </Link>
          </div>
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
