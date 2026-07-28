'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { canAccessAdmin } from '@/lib/auth-routes';
import { useQuery } from '@/lib/hooks/useAsync';
import { serviceCatalogService } from '@/lib/services';
import { useRegisterCmsPage } from '@/components/cms/CmsProvider';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

export interface ServicePageProps {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  features: { title: string; desc: string }[];
  priceRanges?: { label: string; price: string; note?: string }[];
  faqs: { q: string; a: string }[];
  heroImage?: string;
  inlineImage?: string;
  primaryCta?: { label: string; href: string };
  adminProductSlug?: string;
  priceFootnote?: string;
  catalogSlug?: string;
  cmsPage?: string;
  editableTitle?: React.ReactNode;
  editableDescription?: React.ReactNode;
  editableHeroImage?: React.ReactNode;
}

export function ServicePage({
  badge,
  title,
  subtitle,
  description,
  features,
  priceRanges,
  faqs,
  heroImage = '/img/krek/werf-hero.webp',
  inlineImage,
  primaryCta,
  adminProductSlug,
  priceFootnote,
  catalogSlug,
  cmsPage,
  editableTitle,
  editableDescription,
  editableHeroImage,
}: ServicePageProps) {
  const { t, locale } = useIntl();
  const { user, isDemo } = useAuth();
  const isAdmin = canAccessAdmin(user?.role, isDemo);

  useRegisterCmsPage(cmsPage ?? '');
  const cta = primaryCta ?? { label: t('nav.bookCrane'), href: `/${locale}/kraanafspraak` };

  const catalogQuery = useQuery([catalogSlug ?? ''], () =>
    catalogSlug ? serviceCatalogService.page(catalogSlug).catch(() => null) : Promise.resolve(null),
  );
  const liveRanges = React.useMemo(() => {
    const services = catalogQuery.data?.services ?? [];
    const tariffs = services.flatMap((s) => s.tariffs ?? []);
    if (!tariffs.length) return null;
    return tariffs
      .slice()
      .sort((a, b) => a.range_from_cm - b.range_from_cm)
      .map((tf) => ({
        label: tf.range_label,
        price: tf.is_on_request ? t('servicePage.onRequest') : tf.display_price,
        note: tf.range_from_cm === 0 ? t('servicePage.from') : undefined,
      }));
  }, [catalogQuery.data, t]);
  const ranges = liveRanges ?? priceRanges ?? [];

  const p = cmsPage ?? '';

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {editableHeroImage ? (
          <div className="absolute inset-0 [&>span]:block [&>span]:h-full [&>span]:w-full">
            {editableHeroImage}
          </div>
        ) : p ? (
          <EditableImage
            blockKey={`${p}.hero.image`}
            page={p}
            fallbackSrc={heroImage}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-950/65 to-navy-950/30" aria-hidden />
        <div className="container-wide relative pb-24 pt-28 text-white lg:pb-32 lg:pt-40">
          <Badge tone="sand" className="mb-4" dot>
            {p ? (
              <EditableText blockKey={`${p}.hero.badge`} page={p} section="hero">
                {badge}
              </EditableText>
            ) : badge}
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl lg:text-[56px]">
            {editableTitle ?? (p ? (
              <EditableText blockKey={`${p}.hero.title`} page={p} section="hero" type="heading">
                {title}
              </EditableText>
            ) : title)}
          </h1>
          <p className="mt-5 max-w-xl text-sand-100/85">
            {editableDescription ?? (p ? (
              <EditableText blockKey={`${p}.hero.subtitle`} page={p} section="hero" type="paragraph">
                {subtitle}
              </EditableText>
            ) : subtitle)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={cta.href}>
              <Button variant="gold" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                {p ? (
                  <EditableText blockKey={`${p}.hero.cta_primary`} page={p} section="hero">
                    {cta.label}
                  </EditableText>
                ) : cta.label}
              </Button>
            </Link>
            <Link href={`/${locale}/contact`}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                {t('servicePage.askQuestion')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Description with inline photo */}
      <section className="container-wide py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge tone="gold" className="mb-3">
              {t('servicePage.whatItIs')}
            </Badge>
            <p className="text-lg leading-relaxed text-navy-700">
              {p ? (
                <EditableText blockKey={`${p}.body`} page={p} section="body" type="long_text">
                  {description}
                </EditableText>
              ) : description}
            </p>
          </div>
          {inlineImage || p ? (
            p ? (
              <EditableImage
                blockKey={`${p}.inline.image`}
                page={p}
                fallbackSrc={inlineImage ?? heroImage}
                alt={title}
                className="aspect-[5/4] w-full rounded-2xl object-cover shadow-elev"
              />
            ) : (
              <div
                className="aspect-[5/4] w-full rounded-2xl bg-cover bg-center shadow-elev"
                style={{ backgroundImage: `url(${inlineImage})` }}
                aria-hidden
              />
            )
          ) : null}
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card key={f.title} className="p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-navy-900">
                {p ? (
                  <EditableText blockKey={`${p}.feature.${i}.title`} page={p} section="features">
                    {f.title}
                  </EditableText>
                ) : f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-500">
                {p ? (
                  <EditableText blockKey={`${p}.feature.${i}.desc`} page={p} section="features" type="paragraph">
                    {f.desc}
                  </EditableText>
                ) : f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-16">
        <div className="container-wide">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Badge tone="navy" className="mb-3">
                {t('servicePage.pricesBadge')}
              </Badge>
              <h2 className="heading-display text-3xl">{t('servicePage.pricesTitle')}</h2>
              <p className="mt-1 text-sm text-navy-500">{t('servicePage.pricesDesc')}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && adminProductSlug ? (
                <Link href={`/${locale}/admin/producten?search=${encodeURIComponent(adminProductSlug)}`}>
                  <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
                    {t('servicePage.editService')}
                  </Button>
                </Link>
              ) : null}
              <Link href={cta.href}>
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {p ? (
                    <EditableText blockKey={`${p}.cta.label`} page={p} section="cta">
                      {cta.label}
                    </EditableText>
                  ) : cta.label}
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranges.map((r) => (
              <Card key={r.label} className="flex items-center justify-between p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                    {t('servicePage.length')}
                  </div>
                  <div className="text-base font-semibold text-navy-900">{r.label}</div>
                  {r.note ? (
                    <div className="text-[11px] text-navy-400">{r.note}</div>
                  ) : null}
                </div>
                <div className="text-2xl font-semibold text-navy-900">{r.price}</div>
              </Card>
            ))}
          </div>
          {priceFootnote ? (
            <p className="mt-4 text-xs text-navy-400">
              {p ? (
                <EditableText blockKey={`${p}.price.footnote`} page={p} section="prices" type="paragraph">
                  {priceFootnote}
                </EditableText>
              ) : priceFootnote}
            </p>
          ) : null}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-wide grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
        <div>
          <Badge tone="marine" className="mb-3">
            {t('servicePage.faqBadge')}
          </Badge>
          <h2 className="heading-display text-3xl">{t('servicePage.faqTitle')}</h2>
          <p className="mt-2 text-sm text-navy-500">{t('servicePage.faqDesc')}</p>
          <Link href={`/${locale}/contact`} className="mt-5 inline-block">
            <Button variant="outline">{t('servicePage.askQuestion')}</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className="group rounded-xl border border-navy-100 bg-white p-5 transition open:shadow-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none font-medium text-navy-900">
                {p ? (
                  <EditableText blockKey={`${p}.faq.${i}.q`} page={p} section="faq">
                    {f.q}
                  </EditableText>
                ) : f.q}
                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 text-navy-700 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-navy-500">
                {p ? (
                  <EditableText blockKey={`${p}.faq.${i}.a`} page={p} section="faq" type="paragraph">
                    {f.a}
                  </EditableText>
                ) : f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="container-wide pb-24">
        <div className="rounded-2xl bg-navy-900 px-8 py-12 text-white sm:px-12">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
            <div>
              <h3 className="heading-display text-2xl text-white sm:text-3xl">
                {p ? (
                  <EditableText blockKey={`${p}.cta.title`} page={p} section="cta" type="heading">
                    {t('servicePage.ctaTitle')}
                  </EditableText>
                ) : t('servicePage.ctaTitle')}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-sand-100/80">
                {p ? (
                  <EditableText blockKey={`${p}.cta.desc`} page={p} section="cta" type="paragraph">
                    {t('servicePage.ctaDesc')}
                  </EditableText>
                ) : t('servicePage.ctaDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href={cta.href}>
                <Button variant="gold" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {p ? (
                    <EditableText blockKey={`${p}.cta.label`} page={p} section="cta">
                      {cta.label}
                    </EditableText>
                  ) : cta.label}
                </Button>
              </Link>
              <Link href={`/${locale}/contact`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  {t('servicePage.ctaContact')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
