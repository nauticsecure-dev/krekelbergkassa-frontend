'use client';
import { notFound } from 'next/navigation';
import { useIntl } from '@/i18n/IntlProvider';
import { ServicePage } from '@/components/site/ServicePage';
import { useQuery } from '@/lib/hooks/useAsync';
import { serviceCatalogService } from '@/lib/services';
import { ErrorState, LoadingState } from '@/components/admin/DataState';

export default function CatalogServicePage({ params }: { params: { slug: string } }) {
  const { locale, t } = useIntl();
  const query = useQuery([params.slug, locale], () => serviceCatalogService.page(params.slug, locale));
  if (query.errorStatus === 404) notFound();
  if (query.loading) return <div className="container-wide py-20"><LoadingState label={t('adminNew.common.loading')} /></div>;
  if (query.error) return <div className="container-wide py-20"><ErrorState message={query.error} onRetry={() => void query.refetch().catch(() => undefined)} /></div>;
  const service = query.data?.services[0];
  if (!service) notFound();
  return <ServicePage badge={service.group?.name ?? t('nav.services')}
    title={query.data?.page?.title ?? service.name ?? service.code}
    subtitle={service.short_description ?? service.description ?? ''}
    description={service.long_description ?? service.description ?? ''}
    features={[]} faqs={[]} heroImage={service.image_url || undefined}
    catalogSlug={params.slug} catalogServiceCode={service.code} />;
}
