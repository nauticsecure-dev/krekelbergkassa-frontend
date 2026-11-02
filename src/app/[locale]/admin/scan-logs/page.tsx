'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import { ScanLine, Zap } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';

import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { productsService } from '@/lib/services';
import { formatDateTime, intlLocale } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

const SOURCES = ['usb', 'camera', 'manual', 'api'];

export default function ScanLogsPage() {
  const { locale, t } = useIntl();
  const dateLocale = intlLocale(locale);
  const [page, setPage] = React.useState(1);
  const [source, setSource] = React.useState('');
  const [result, setResult] = React.useState('');
  const [date, setDate] = React.useState('');

  const logs = useQuery([page, source, result, date], () =>
    productsService.scanLogs({
      page,
      per_page: 25,
      source: source || undefined,
      result: result || undefined,
      date: date || undefined,
    })
  );

  const rows = logs.data?.data ?? [];

  const resultTone = (r: string) => {
    switch (r) {
      case 'matched': return 'success' as const;
      case 'not_found': return 'danger' as const;
      case 'multiple': return 'warning' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.scanLogs.title', { defaultValue: 'Scan Audit Log' })}
        subtitle={t('adminNew.scanLogs.subtitle', { defaultValue: 'Elke barcode scan in de kassa — bron, resultaat, product en medewerker' })}
        stats={[
          { label: t('adminNew.scanLogs.stats.total', { defaultValue: 'Totaal' }), value: logs.data?.meta?.total ?? rows.length, icon: ScanLine, tone: 'marine' },
          { label: t('adminNew.scanLogs.stats.matched', { defaultValue: 'Gevonden' }), value: rows.filter((r) => String(r.result ?? '') === 'matched').length, icon: ScanLine, tone: 'success' },
          { label: t('adminNew.scanLogs.stats.notFound', { defaultValue: 'Niet gevonden' }), value: rows.filter((r) => String(r.result ?? '') === 'not_found').length, icon: ScanLine, tone: 'danger' },
        ]}
      />

      <AdminContent>
        <AdminSectionCard title={t('adminNew.scanLogs.title', { defaultValue: 'Scan Audit Log' })} icon={ScanLine}>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="w-44">
              <AdminSelect value={source} onChange={(v) => { setSource(v); setPage(1); }}>
                <option value="">{t('adminNew.scanLogs.allSources', { defaultValue: 'Alle bronnen' })}</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </AdminSelect>
            </div>
            <div className="w-44">
              <AdminSelect value={result} onChange={(v) => { setResult(v); setPage(1); }}>
                <option value="">{t('adminNew.scanLogs.allResults', { defaultValue: 'Alle resultaten' })}</option>
                <option value="matched"><TranslatedText textKey="siteCopy.69f11e8dfe0edffa" fallbackText={"matched"} inline={false} /></option>
                <option value="not_found"><TranslatedText textKey="siteCopy.e0d39215ff4ef37f" fallbackText={"not_found"} inline={false} /></option>
                <option value="multiple"><TranslatedText textKey="siteCopy.bd753cf2d72bdf28" fallbackText={"multiple"} inline={false} /></option>
              </AdminSelect>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              className="input-base"
            />
          </div>

          {logs.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!logs.loading && logs.error ? <ErrorState message={logs.error} onRetry={() => void logs.refetch()} /> : null}

          {!logs.loading && !logs.error ? (
            rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.scanLogs.emptyTitle', { defaultValue: 'Geen scan logs' })}
                message={t('adminNew.scanLogs.emptyMessage', { defaultValue: 'Nog geen scans geregistreerd.' })}
              />
            ) : (
              <AdminTableCard footer={
                <AdminTableFooter
                  summary={`${logs.data?.meta?.total ?? rows.length} scans`}
                  meta={logs.data?.meta}
                  onPageChange={setPage}
                />
              }>
                <AdminTable minWidth={900}>
                  <AdminTableHead>
                    <tr>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.timestamp'} vars={{ defaultValue: 'Tijdstip' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.barcode'} vars={{ defaultValue: 'Barcode' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.source'} vars={{ defaultValue: 'Bron' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.result'} vars={{ defaultValue: 'Resultaat' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.product'} vars={{ defaultValue: 'Product' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.fastScan'} vars={{ defaultValue: 'Fast scan' }} />}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{<TranslatedText textKey={'adminNew.scanLogs.columns.user'} vars={{ defaultValue: 'Medewerker' }} />}</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {rows.map((row) => {
                      const product = row.product as Record<string, unknown> | null | undefined;
                      const user = row.user as Record<string, unknown> | null | undefined;
                      return (
                        <AdminTableRow key={String(row.id)}>
                          <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">
                            {row.scanned_at ? formatDateTime(String(row.scanned_at), dateLocale) : '—'}
                          </AdminTableCell>
                          <AdminTableCell className="font-mono text-xs">{String(row.barcode ?? '—')}</AdminTableCell>
                          <AdminTableCell>
                            <Badge tone="navy">{String(row.source ?? '—')}</Badge>
                          </AdminTableCell>
                          <AdminTableCell>
                            <Badge tone={resultTone(String(row.result ?? ''))}>
                              {String(row.result ?? '—')}
                            </Badge>
                          </AdminTableCell>
                          <AdminTableCell className="text-sm">
                            {product?.name ? (
                              <span className="font-semibold text-marine-700">{String(product.name)}</span>
                            ) : <span className="text-navy-400">—</span>}
                          </AdminTableCell>
                          <AdminTableCell>
                            {row.fast_scan ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600">
                                <Zap className="h-3 w-3" /> <TranslatedText textKey="siteCopy.24d9ede32744b5ab" fallbackText={" Ja"} /></span>
                            ) : (
                              <span className="text-xs text-navy-400"><TranslatedText textKey="siteCopy.b91ec243d126e82e" fallbackText={"Nee"} /></span>
                            )}
                          </AdminTableCell>
                          <AdminTableCell className="text-xs">
                            {user?.name ? String(user.name) : '—'}
                          </AdminTableCell>
                        </AdminTableRow>
                      );
                    })}
                  </tbody>
                </AdminTable>
              </AdminTableCard>
            )
          ) : null}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
