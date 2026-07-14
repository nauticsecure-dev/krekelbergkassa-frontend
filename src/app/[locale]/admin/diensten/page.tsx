'use client';

import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Pencil, ShoppingCart, Layers } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { serviceCatalogService } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';
import { LoadingState, ErrorState } from '@/components/admin/DataState';

const KNOWN_SLUGS = [
  { slug: 'afspuiten', label: 'Afspuiten', publicPath: '/diensten/afspuiten', adminSearch: 'afspuiten' },
  { slug: 'winterstalling', label: 'Winterstalling', publicPath: '/diensten/winterstalling', adminSearch: 'STALL-WINTER' },
  { slug: 'zelf-werken', label: 'Zelf werken', publicPath: '/diensten/zelf-werken', adminSearch: 'WERF-' },
];

export default function DienstenAdminPage() {
  const { locale } = useIntl();

  const catalogQueries = KNOWN_SLUGS.map((s) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery([`catalog-${s.slug}`], () =>
      serviceCatalogService.page(s.slug).catch(() => null)
    )
  );

  const loading = catalogQueries.some((q) => q.loading);
  const error = catalogQueries.find((q) => q.error)?.error ?? null;

  return (
    <>
      <AdminPageHeader
        title="Diensten & Tarieven"
        subtitle="Overzicht van alle servicepagina's — producten, zichtbaarheid en live tarieven"
      />
      <AdminContent>
        <AdminSectionCard title="Service catalog" icon={Layers}>
          {loading ? <LoadingState label="Laden..." variant="table" /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}
          {!loading && !error ? (
            <AdminTableCard>
              <AdminTable minWidth={700}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>Pagina</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Producten gevonden</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Tariefregels</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Zichtbaarheid</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {KNOWN_SLUGS.map((s, i) => {
                    const q = catalogQueries[i];
                    const page = q.data;
                    const services = page?.services ?? [];
                    const hasProducts = services.length > 0;
                    const totalTariffs = services.reduce((n, svc) => n + (svc.tariffs?.length ?? 0), 0);
                    const vis = services[0]?.visibility ?? {};

                    return (
                      <AdminTableRow key={s.slug}>
                        <AdminTableCell>
                          <div className="font-semibold text-navy-800">{s.label}</div>
                          <div className="text-xs text-navy-400">/diensten/{s.slug}</div>
                        </AdminTableCell>
                        <AdminTableCell>
                          {hasProducts ? (
                            <Badge tone="success">Live (DB)</Badge>
                          ) : (
                            <Badge tone="warning">Statische fallback</Badge>
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="tabular-nums">
                          {hasProducts ? (
                            <span className="text-sm font-medium text-navy-800">{services.length}</span>
                          ) : (
                            <span className="text-sm text-navy-300">0</span>
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="tabular-nums">
                          {totalTariffs > 0 ? (
                            <span className="text-sm font-medium text-navy-800">{totalTariffs}</span>
                          ) : (
                            <span className="text-sm text-navy-300">—</span>
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex flex-wrap gap-1">
                            {vis.public ? <Badge tone="marine">website</Badge> : <Badge tone="neutral">−website</Badge>}
                            {vis.kassa ? <Badge tone="gold">kassa</Badge> : <Badge tone="neutral">−kassa</Badge>}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/${locale}${s.publicPath}`} target="_blank">
                              <Button size="sm" variant="outline" leftIcon={<Globe className="h-3.5 w-3.5" />}>
                                Bekijk
                              </Button>
                            </Link>
                            <Link href={`/${locale}/admin/producten?search=${encodeURIComponent(s.adminSearch)}`}>
                              <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />}>
                                Product
                              </Button>
                            </Link>
                            <Link href={`/${locale}/admin/calculator/pricing`}>
                              <Button size="sm" variant="ghost" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}>
                                Tarieven
                              </Button>
                            </Link>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>

        {/* Per-page tariff breakdown */}
        {!loading && KNOWN_SLUGS.map((s, i) => {
          const services = catalogQueries[i].data?.services ?? [];
          if (services.length === 0) return null;
          return (
            <AdminSectionCard key={s.slug} title={`${s.label} — tarieven`} icon={ExternalLink}>
              {services.map((svc) => (
                <div key={svc.code ?? svc.slug} className="mb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold text-navy-800">{svc.name ?? svc.code}</span>
                    {svc.service_code ? <Badge tone="navy">{svc.service_code}</Badge> : null}
                  </div>
                  {svc.tariffs && svc.tariffs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {svc.tariffs.map((t, ti) => (
                        <div key={ti} className="rounded border border-navy-100 bg-sand-50 px-2.5 py-1 text-xs">
                          <span className="font-medium text-navy-700">{t.range_label}</span>
                          <span className="ml-2 text-navy-500">{t.display_price}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-navy-400">Geen tariefregels in database. Voeg toe via Calculatie → Tariefregels.</p>
                  )}
                </div>
              ))}
            </AdminSectionCard>
          );
        })}
      </AdminContent>
    </>
  );
}
