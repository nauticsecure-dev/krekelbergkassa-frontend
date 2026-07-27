'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Anchor,
  ArrowRight,
  Calendar,
  Droplets,
  Hammer,
  MapPin,
  Phone,
  Plus,
  Ship,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useIntl } from '@/i18n/IntlProvider';
import { companyInfo } from '@/lib/company';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks/useAsync';
import {
  serviceCatalogService,
  type ServiceCatalogService,
} from '@/lib/services';
import { useRegisterCmsPage } from '@/components/cms/CmsProvider';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten';

interface ServiceSection {
  key: string;
  href: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  ctaPrimary: 'crane' | 'sale' | 'detail';
}

const SECTIONS: ServiceSection[] = [
  { key: 'crane',      href: '/kraanafspraak',           image: '/img/krek/kranen-hero.webp',   icon: Ship,      ctaPrimary: 'crane' },
  { key: 'wash',       href: '/diensten/afspuiten',      image: '/img/krek/portaalkraan.webp',  icon: Droplets,  ctaPrimary: 'detail' },
  { key: 'storage',    href: '/diensten/winterstalling', image: '/img/krek/winterstalling.webp',icon: Warehouse, ctaPrimary: 'detail' },
  { key: 'diy',        href: '/diensten/zelf-werken',    image: '/img/krek/werkzaamheden.webp', icon: Hammer,    ctaPrimary: 'detail' },
  { key: 'hall',       href: '/contact',                 image: '/img/krek/halverhuur.webp',    icon: Wrench,    ctaPrimary: 'detail' },
  { key: 'brokerage',  href: '/verkoop',                 image: '/img/krek/verkoop-schip.webp', icon: Anchor,    ctaPrimary: 'sale' },
];

const FAQS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

/** A service-catalog group with its public, visible services (Trello #100). */
interface LiveGroup {
  key: string;
  name: string;
  services: ServiceCatalogService[];
}

/**
 * Group the flat list of catalog services by their `group`, keeping only
 * publicly visible entries. Returns `null` when there is nothing renderable
 * so the page can fall back to the static {@link SECTIONS} content.
 */
function groupLiveServices(services: ServiceCatalogService[] | undefined): LiveGroup[] | null {
  if (!services?.length) return null;
  const order: string[] = [];
  const byKey = new Map<string, LiveGroup>();

  for (const svc of services) {
    // Respect the public visibility flag when present; otherwise assume public.
    if (svc.visibility?.public === false) continue;
    const groupName = svc.group?.name?.trim();
    const key = svc.group?.code?.trim() || groupName || 'overig';
    let group = byKey.get(key);
    if (!group) {
      group = { key, name: groupName || svc.name || key, services: [] };
      byKey.set(key, group);
      order.push(key);
    }
    group.services.push(svc);
  }

  const groups = order
    .map((key) => byKey.get(key)!)
    .filter((g) => g.services.length > 0);
  return groups.length ? groups : null;
}

export default function DienstenPage() {
  const { t, locale } = useIntl();
  useRegisterCmsPage(CMS_PAGE);
  const [openFaq, setOpenFaq] = React.useState<string | null>('faq1');

  // Trello #100: drive the service overview from the shared product DB, falling
  // back to the static SECTIONS content when the API is empty or unreachable.
  const catalogQuery = useQuery([], () =>
    serviceCatalogService
      .services()
      .then((res) => res.services)
      .catch(() => null),
  );
  const liveGroups = React.useMemo(
    () => groupLiveServices(catalogQuery.data ?? undefined),
    [catalogQuery.data],
  );

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <EditableImage
          blockKey="diensten.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/boot-kranen.webp"
          alt="Diensten hero"
          className="absolute inset-0"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-navy-950/35"
        />
        <div className="container-wide relative pb-20 pt-16 text-white sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
          <Badge tone="sand" dot className="mb-4">
            <EditableText blockKey="diensten.hero.badge" page={CMS_PAGE} section="hero">
              {t('werf.heroBadge')}
            </EditableText>
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl">
            <EditableText blockKey="diensten.hero.title" page={CMS_PAGE} section="hero" type="heading">
              {t('werf.heroTitle')}
            </EditableText>
          </h1>
          <p className="mt-4 max-w-xl text-sand-100/85">
            <EditableText blockKey="diensten.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
              {t('werf.heroSubtitle')}
            </EditableText>
          </p>

          {/* Anchor nav */}
          <div className="mt-8 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.key}
                href={`#${s.key}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-sand-100 backdrop-blur transition hover:bg-white/10"
              >
                <s.icon className="h-3.5 w-3.5 text-gold-300" />
                {t(`werf.s.${s.key}.title`)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Intro paragraph ───────── */}
      <section className="container-wide py-12">
        <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-navy-700">
          {t('werf.intro')}
        </p>
      </section>

      {/* ───────── Sections (alternating photo/text) ───────── */}
      <section className="bg-white py-6">
        <div className="container-wide space-y-20">
          {liveGroups ? (
            <div className="space-y-14">
              <div className="mx-auto max-w-2xl text-center">
                <Badge tone="gold" className="mb-3">
                  {t('servicePage.pricesBadge')}
                </Badge>
                <h2 className="heading-display text-3xl text-navy-900">
                  {t('servicePage.overviewTitle')}
                </h2>
                <p className="mt-2 text-sm text-navy-500">
                  {t('servicePage.overviewSubtitle')}
                </p>
              </div>
              {liveGroups.map((group) => (
                <LiveServiceGroup key={group.key} group={group} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            SECTIONS.map((s, i) => (
              <ServiceBlock
                key={s.key}
                flip={i % 2 === 1}
                section={s}
                locale={locale}
                t={t}
              />
            ))
          )}
        </div>
      </section>

      {/* ───────── FAQ accordion ───────── */}
      <section className="container-wide grid gap-10 py-20 lg:grid-cols-[1fr_2fr]">
        <div>
          <Badge tone="marine" className="mb-3">
            {t('werf.faqBadge')}
          </Badge>
          <h2 className="heading-display text-3xl text-navy-900">
            {t('werf.faqTitle')}
          </h2>
          <p className="mt-2 text-sm text-navy-500">{t('werf.faqSubtitle')}</p>
          <Link
            href={`/${locale}/faq`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-marine-700"
          >
            {t('werf.allFaq')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {FAQS.map((id) => {
            const open = openFaq === id;
            return (
              <div
                key={id}
                className={cn(
                  'rounded-xl border bg-white transition',
                  open ? 'border-navy-200 shadow-card' : 'border-navy-100 hover:border-navy-200'
                )}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-navy-900">
                    {t(`werf.faq.${id}.q`)}
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-100 text-navy-700 transition',
                      open && 'rotate-45 bg-navy-900 text-white'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
                {open ? (
                  <p className="border-t border-navy-100 px-5 py-4 text-sm leading-relaxed text-navy-600">
                    {t(`werf.faq.${id}.a`)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── Maak een afspraak (footer CTA) ───────── */}
      <section className="container-wide pb-20">
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div
              className="relative aspect-[5/3] bg-cover bg-center lg:aspect-auto"
              style={{ backgroundImage: 'url(/img/krek/jachthaven.webp)' }}
            />
            <div className="p-8 sm:p-10">
              <Badge tone="navy" className="mb-3">
                {t('werf.ctaBadge')}
              </Badge>
              <h2 className="heading-display text-3xl text-navy-900">
                {t('werf.ctaTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                {t('werf.ctaBody')}
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-navy-700">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-marine-700" />
                  {companyInfo.address}
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-marine-700" />
                  <a href={companyInfo.phoneHref} className="hover:text-navy-900">
                    {companyInfo.phone}
                  </a>
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/${locale}/kraanafspraak`}>
                  <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    {t('werf.ctaPlan')}
                  </Button>
                </Link>
                <Link href={`/${locale}/contact`}>
                  <Button variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
                    {t('werf.ctaContact')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ServiceBlock({
  section,
  flip,
  locale,
  t,
}: {
  section: ServiceSection;
  flip: boolean;
  locale: string;
  t: (key: string) => string;
}) {
  const Icon = section.icon;

  const primaryHref =
    section.ctaPrimary === 'crane'
      ? `/${locale}/kraanafspraak`
      : section.ctaPrimary === 'sale'
        ? 'https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond'
        : `/${locale}${section.href}`;

  const isExternal = primaryHref.startsWith('http');

  return (
    <article
      id={section.key}
      className="grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center"
    >
      <div
        className={cn(
          'aspect-[5/4] w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-card',
          flip && 'lg:order-2'
        )}
        style={{ backgroundImage: `url(${section.image})` }}
      />
      <div className={cn(flip && 'lg:order-1')}>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-marine-50 text-marine-700">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
          {t(`werf.s.${section.key}.title`)}
        </h2>
        <p className="mt-4 leading-relaxed text-navy-600">
          {t(`werf.s.${section.key}.p1`)}
        </p>
        <p className="mt-3 leading-relaxed text-navy-600">
          {t(`werf.s.${section.key}.p2`)}
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {(['b1', 'b2', 'b3', 'b4'] as const).map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-navy-700">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500"
              />
              {t(`werf.s.${section.key}.${b}`)}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          {isExternal ? (
            <a href={primaryHref} target="_blank" rel="noreferrer">
              <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                {t(`werf.s.${section.key}.cta`)}
              </Button>
            </a>
          ) : (
            <Link href={primaryHref}>
              <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                {t(`werf.s.${section.key}.cta`)}
              </Button>
            </Link>
          )}
          <Link href={`/${locale}${section.href}`}>
            <Button variant="outline">{t('werf.more')}</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function LiveServiceGroup({
  group,
  locale,
  t,
}: {
  group: LiveGroup;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <article className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h3 className="heading-display text-2xl text-navy-900 sm:text-3xl">{group.name}</h3>
        <Link
          href={`/${locale}/kraanafspraak`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-marine-700"
        >
          {t('werf.ctaPlan')} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {group.services.map((svc) => {
          const tariffs = (svc.tariffs ?? [])
            .slice()
            .sort((a, b) => a.range_from_cm - b.range_from_cm);
          return (
            <Card key={svc.code} className="flex flex-col p-6">
              <h4 className="text-base font-semibold text-navy-900">
                {svc.name ?? svc.code}
              </h4>
              {svc.description ? (
                <p className="mt-1.5 text-sm leading-relaxed text-navy-500">
                  {svc.description}
                </p>
              ) : null}
              {tariffs.length ? (
                <ul className="mt-4 space-y-1.5 border-t border-navy-100 pt-4">
                  {tariffs.map((tf) => (
                    <li
                      key={`${tf.range_from_cm}-${tf.range_to_cm}`}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-navy-600">
                        {tf.range_from_cm === 0 ? `${t('servicePage.from')} ` : ''}
                        {tf.range_label}
                      </span>
                      <span className="font-semibold text-navy-900">
                        {tf.is_on_request ? t('servicePage.onRequest') : tf.display_price}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </div>
    </article>
  );
}
