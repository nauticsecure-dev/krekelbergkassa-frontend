'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import Link from 'next/link';
import {
  Anchor,
  MapPin,
  Ruler,
  Ship,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalDetailGrid,
  PortalModalBody,
  PortalModalFooter,
  PortalModalHeader,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import type { PortalBoat } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { BoatPhoto } from '@/components/portal/BoatPhoto';
import { getApiErrorMessage } from '@/lib/api-error';
import { useBoatPhotoVersion } from '@/lib/hooks/useBoatPhotoVersion';

export default function PortalBoatsPage() {
  const { t, locale } = useIntl();
  const [selected, setSelected] = React.useState<PortalBoat | null>(null);

  const photoVersion = useBoatPhotoVersion();
  const boats = useQuery([photoVersion], () => portalService.boats());
  React.useEffect(() => {
    setSelected(current => current ? boats.data?.find(boat => boat.id === current.id) ?? current : null);
  }, [boats.data]);
  const items = boats.data ?? [];
  const [uploading, setUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string>();

  async function replacePhoto(boat: PortalBoat, file: File) {
    setUploading(true);
    setPhotoError(undefined);
    try {
      const updated = await portalService.replaceBoatPhoto(boat.id, file);
      setSelected((current) => current?.id === boat.id ? updated : current);
    } catch (error) {
      setPhotoError(getApiErrorMessage(error, t('login.requestFailed')));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.boats.title')}
        subtitle={t('adminNew.portal.boats.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.boats.metricTotal'),
            value: items.length,
            icon: Ship,
            tone: 'marine',
            loading: boats.loading,
          },
          {
            label: t('adminNew.portal.boats.metricWithLocation'),
            value: items.filter((b) => b.location_code).length,
            icon: MapPin,
            tone: 'gold',
            loading: boats.loading,
          },
          {
            label: t('adminNew.portal.boats.metricRegistered'),
            value: items.filter((b) => b.registration_number).length,
            icon: Anchor,
            tone: 'navy',
            loading: boats.loading,
          },
          {
            label: t('adminNew.portal.boats.metricAvgLength'),
            value: items.length
              ? `${Math.round(
                  items.reduce((sum, b) => sum + Number(b.length_cm || 0), 0) / items.length
                )} cm`
              : '—',
            icon: Ruler,
            tone: 'success',
            loading: boats.loading,
          },
        ]}
      />

      <PortalContent>
        <PortalSectionCard
          title={t('adminNew.portal.boats.title')}
          description={t('adminNew.portal.boats.listOverview')}
          icon={Ship}
          action={
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="gold" size="sm">{<TranslatedText textKey={'adminNew.portal.boats.planService'} />}</Button>
            </Link>
          }
        >
        {boats.loading ? (
          <LoadingState label={t('adminNew.portal.boats.loading')} variant="cards" />
        ) : null}

        {!boats.loading && boats.error ? (
          <ErrorState message={boats.error} onRetry={() => void boats.refetch()} />
        ) : null}

        {!boats.loading && !boats.error && items.length === 0 ? (
          <EmptyState
            title={t('adminNew.portal.boats.empty')}
            message={t('adminNew.portal.boats.emptyMessage')}
          />
        ) : null}

        {!boats.loading && !boats.error && items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((boat) => (
              <button
                key={boat.id}
                type="button"
                onClick={() => { setPhotoError(undefined); setSelected(boat); }}
                className="group overflow-hidden rounded-xl2 border border-navy-100 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-elev"
              >
                <div className="relative aspect-[16/10]">
                  <BoatPhoto boat={boat} thumbnail />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <Badge tone="gold" className="mb-2">
                      {boat.type}
                    </Badge>
                    <div className="text-lg font-semibold text-white">{boat.name}</div>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs text-navy-500">
                    <span>{boat.registration_number || t('adminNew.common.unknown')}</span>
                    <span>{boat.length_cm ? `${boat.length_cm} cm` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-navy-700">
                    <MapPin className="h-3.5 w-3.5 text-marine-600" />
                    {boat.location_code || t('adminNew.portal.boats.noLocation')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
        </PortalSectionCard>
      </PortalContent>

      <Modal open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected ? (
          <>
            <PortalModalHeader
              eyebrow={selected.type}
              title={selected.name}
              subtitle={selected.registration_number || t('adminNew.portal.boats.noRegistration')}
            />
            <PortalModalBody>
              <div className="aspect-[16/7] overflow-hidden rounded-xl">
                <BoatPhoto boat={selected} />
              </div>
              <label className="my-4 block text-sm font-semibold">
                <TranslatedText textKey="login.boatPhoto" />
                <input className="mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void replacePhoto(selected, file);
                  }} />
              </label>
              {photoError && <p role="alert" className="text-sm text-rose-700">{photoError}</p>}
              <PortalDetailGrid
                items={[
                  {
                    label: t('adminNew.portal.boats.length'),
                    value: selected.length_cm ? `${selected.length_cm} cm` : '—',
                  },
                  {
                    label: t('adminNew.boats.fields.widthCm'),
                    value: selected.width_cm ? `${selected.width_cm} cm` : '—',
                  },
                  {
                    label: t('adminNew.portal.boats.location'),
                    value: selected.location_code || '—',
                  },
                  {
                    label: t('adminNew.boats.columns.type'),
                    value: selected.type,
                  },
                ]}
              />
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {<TranslatedText textKey={'adminNew.common.cancel'} />}
              </Button>
              <Link href={`/${locale}/dashboard/boten/${selected.id}`}>
                <Button variant="outline">{<TranslatedText textKey={'adminNew.portal.boats.viewDossier'} />}</Button>
              </Link>
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="gold">{<TranslatedText textKey={'adminNew.portal.boats.planService'} />}</Button>
              </Link>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>
    </>
  );
}
